import React, { Component, PropTypes } from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { withNavigation } from '@expo/ex-navigation';
import colors from 'kolors';
import Collapsible from 'react-native-collapsible';
import ElevatedView from 'react-native-elevated-view';
import Router from 'Router';
import connectDropdownAlert from '../utils/connectDropdownAlert';
import createWazeDeepLink from '../utils/createWazeDeepLink';
import { phonecall } from 'react-native-communications';
import CardSublabel from './styled/CardSublabel';
import CardLabel from './styled/CardLabel';
import CardHeader from './styled/CardHeader';
import CardIndicator from './styled/CardIndicator';
import { observer } from 'mobx-react/native';
import { observable } from 'mobx';
import _ from 'lodash';

@withNavigation
@connectDropdownAlert
@observer
export default class Carpooler extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    event: PropTypes.object.isRequired,
    pickedUpUsers: PropTypes.number,
    navigator: PropTypes.object.isRequired,
    navigation: PropTypes.object.isRequired,
    passengers: PropTypes.array.isRequired,
    refresh: PropTypes.func,
    selfIsDriver: PropTypes.bool,
    alertWithType: PropTypes.func.isRequired,
  };

  @observable isCollapsed = true;

  confirmAttendance = () => {
    const passIndex = this.props.event.yourRide.passengers.findIndex(
      i => i.userUID === this.props.user.userUID
    );
    global.firebaseApp
      .database()
      .ref('schools')
      .child(this.props.event.schoolUID)
      .child('events')
      .child(this.props.event.uid)
      .child('rides')
      .child(this.props.event.yourRide.uid)
      .child('passengers')
      .child(this.props.event.yourRide.passengers[passIndex].passUID)
      .update({ isPickedUp: !this.props.user.isPickedUp })
      .then(() => {
        this.props.refresh(false);
      })
      .catch(err => {
        this.props.alertWithType('error', 'Error', err.toString());
      });
  };

  contact = () => {
    phonecall(this.props.user.phoneNumber, true);
  };

  meetDriver = () => {
    let self;
    this.props.passengers.forEach(pass => {
      if (pass.userUID === global.firebaseApp.auth().currentUser.uid) {
        self = pass;
      }
    });
    this.props.navigation.getNavigator('master').push(
      Router.getRoute('meetDriver', {
        self,
        driver: this.props.event.yourRide.driver,
      })
    );
  };

  pickup = () => {
    global.firebaseApp
      .database()
      .ref('schools')
      .child(this.props.user.school)
      .child('pickupLocations')
      .once('value')
      .then(locSnap => {
        let location;
        _.each(locSnap.val(), loc => {
          if (loc.name === this.props.user.location) {
            location = loc;
          }
        });

        this.props.navigation.getNavigator('master').push(
          Router.getRoute('meetRider', {
            pickupLocation: location,
            rider: this.props.user,
            wazeUrl: createWazeDeepLink(location.lat, location.lon),
          })
        );
      })
      .catch(err => {
        this.props.alertWithType('error', 'Error', err.toString());
      });
  };

  renderDriverContent = () => // driver view if you're a rider
  (
    <View style={styles.collapsedContentContainer}>
      <TouchableOpacity onPress={() => this.contact()}>
        <View style={styles.contactDriverButton}>
          <Text style={styles.buttonText}>
            CONTACT
          </Text>
        </View>
      </TouchableOpacity>
      {!this.props.event.yourRide.rideStarted &&
        <TouchableOpacity onPress={() => this.meetDriver()}>
          <View style={styles.meetDriverButton}>
            <Text style={styles.buttonText}>
              MEET FOR PICKUP
            </Text>
          </View>
        </TouchableOpacity>}
    </View>
  );

  renderPeerPassengerContent = () => // rider view if you're a rider (or if you're a rider you shouldn't have access to other's stuff)
  (
    <View style={styles.collapsedContentContainer}>
      <TouchableOpacity onPress={() => this.contact()}>
        <View style={styles.contactDriverButton}>
          <Text style={styles.buttonText}>
            CONTACT
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  renderDriverPassengerContent = () => // rider view if you're a driver
  (
    <View style={styles.collapsedContentContainer}>
      <View style={styles.twoButtonRow}>
        <TouchableOpacity onPress={() => this.contact()}>
          <View style={styles.leftButton}>
            <Text style={styles.buttonText}>
              CONTACT
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this.pickup()}>
          <View style={styles.rightButton}>
            <Text style={styles.buttonText}>
              PICKUP
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => this.confirmAttendance()}>
        <View style={styles.bottomButton}>
          <Text style={styles.buttonText}>
            {this.props.user.isPickedUp
              ? 'UNCONFIRM ATTENDANCE'
              : 'CONFIRM ATTENDANCE'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  render() {
    return this.props.user.userUID !==
      global.firebaseApp.auth().currentUser.uid &&
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => this.isCollapsed = !this.isCollapsed}
      >
        <ElevatedView style={styles.cardContainer} elevation={2}>
          <CardHeader>
            <CardLabel>
              {this.props.user.displayName.toUpperCase()}
            </CardLabel>
            <CardSublabel>
              {this.props.user.type.toUpperCase()}
            </CardSublabel>
          </CardHeader>
          <CardIndicator
            active={
              this.props.pickedUpUsers === this.props.passengers.length ||
                (this.props.event.yourRide.rideStarted ||
                  this.props.user.isPickedUp)
            }
          />
          <Collapsible duration={200} collapsed={this.isCollapsed}>
            {this.props.selfIsDriver &&
              this.props.user.type === 'rider' &&
              this.renderDriverPassengerContent()}
            {this.props.user.type === 'rider' &&
              !this.props.selfIsDriver &&
              this.renderPeerPassengerContent()}
            {this.props.user.type === 'driver' && this.renderDriverContent()}
          </Collapsible>
        </ElevatedView>
      </TouchableOpacity>;
  }
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    // borderRadius: 4,
    marginVertical: 4,
    backgroundColor: 'white',
  },
  collapsedContentContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  locationText: {
    fontFamily: 'open-sans',
    fontSize: 14,
    textAlign: 'center',
    color: colors.black,
    marginBottom: 16,
  },
  locationTextPlace: {
    fontFamily: 'open-sans-semibold',
    fontSize: 14,
    color: colors.black,
  },
  location: {
    flexDirection: 'row',
  },
  contactDriverButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 8,
    backgroundColor: colors.blue,
  },
  meetDriverButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 8,
    marginTop: 16,
    backgroundColor: colors.hotPink,
  },
  buttonText: {
    fontFamily: 'open-sans-bold',
    fontSize: 18,
    color: 'white',
  },
  twoButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    width: Dimensions.get('window').width * 0.40,
    paddingVertical: 8,
    backgroundColor: colors.blue,
  },
  rightButton: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 8,
    width: Dimensions.get('window').width * 0.40,
    backgroundColor: colors.hotPink,
  },
  bottomButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 8,
    backgroundColor: colors.neonGreen,
    marginTop: 16,
  },
});
