import React, { Component, useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DeviceInfo from 'react-native-device-info';
import ViewTransformer from "react-native-easy-view-transformer";

const DRAG_DISMISS_THRESHOLD_X = 120;
const DRAG_DISMISS_THRESHOLD_Y = 250;
const isIOS = Platform.OS === "ios";

const LightboxOverlay = (props) => {
  
  const [deviceWidth, setDeviceWidth] = useState(Dimensions.get("window").width);
  const [deviceHeight, setDeviceHeight] = useState(Dimensions.get("window").height);

  const styles = StyleSheet.create({
    background: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: deviceWidth,
      height: deviceHeight,
    },
    open: {
      position: 'absolute',
      flex: 1,
      justifyContent: 'center',
      // Android pan handlers crash without this declaration:
      backgroundColor: 'transparent',
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      width: deviceWidth,
      backgroundColor: 'transparent',
    },
    closeButton: {
      fontSize: 35,
      color: "white",
      lineHeight: 60,
      width: 70,
      textAlign: "center",
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowRadius: 1.5,
      shadowColor: "black",
      shadowOpacity: 0.8,
      marginTop: 20,
    },
  });

  const openVal = useRef(new Animated.Value(0));
  const opacityVal = new Animated.Value(1.0);

  const [allowTransform, setAllowTransform] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isViewScaled, setIsViewScaled] = useState(false);
  const [target, setTarget] = useState({
    x: 0,
    y: 0,
    opacity: 1.0
  });

  const handleRotation = () => {
    if (DeviceInfo.isTablet()) {
      setDeviceWidth(Dimensions.get('window').width);
      setDeviceHeight(Dimensions.get('window').height);
    }
  };
  useEffect(() => {
    Dimensions.addEventListener("change", handleRotation);
    return () => {
      Dimensions.removeEventListener("change", handleRotation);
    };
  }, []);

  useEffect(() => {
    if (props.isOpen) {
      open();
    }
  }, [props.isOpen]);

  open = () => {
    if (isIOS) {
      StatusBar.setHidden(true, "fade");
    }

    setIsAnimating(true);
    setIsOpen(true);
    setTarget({
      x: 0,
      y: 0,
      opacity: 1.0,
    });
    Animated.spring(openVal.current, {
      toValue: 1,
      ...props.springConfig,
      useNativeDriver: false,
    }).start(() => {
      setIsAnimating(false);
      props.didOpen();
    });
  };

  close = () => {
    props.willClose();
    if (isIOS) {
      StatusBar.setHidden(false, "fade");
    }

    setIsAnimating(true);
    setIsOpen(false);
    Animated.spring(openVal.current, {
      toValue: 0,
      ...props.springConfig,
      useNativeDriver: false,
    }).start(() => {
      setIsAnimating(false);
      props.onClose();
    });
  };

  const lightboxOpacityStyle = {
    opacity: openVal.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0, target.opacity],
    }),
  };

  const openStyle = [
    styles.open,
    {
      left: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.x, target.x],
      }),
      top: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [
          props.origin.y ,
          target.y,
        ],
      }),
      width: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.width, deviceWidth],
      }),
      height: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.height, deviceHeight],
      }),
    },
  ];

  const background = (
    <Animated.View
      style={[
        styles.background,
        { backgroundColor: props.backgroundColor },
        lightboxOpacityStyle,
      ]}
    ></Animated.View>
  );
  const header = (
    <Animated.View style={[styles.header, lightboxOpacityStyle]}>
      {props.renderHeader ? (
        props.renderHeader(close)
      ) : (
        <TouchableOpacity onPress={close}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
  const content = (
    <Animated.View style={[openStyle]}>
      <Animated.View style={{
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        justifyContent: 'center', 
        opacity: opacityVal
      }}/>
      <ViewTransformer
        maxScale={2}
        enableResistance={false}
        enableTransform={allowTransform}
        onTransformGestureReleased={(tfn) => {
          if(tfn.scale !== 1.0) {
            return;
          }
          if( Math.abs(tfn.translateX/deviceWidth) > 0.25 || Math.abs(tfn.translateY/deviceHeight) > 0.15 ) {
            setTimeout(close, 150);
          }
        }}
        onViewTransformed={(tfn) => {
          if(!allowTransform) {
            return;
          }
          const isScaled = tfn.scale !== 1.0
          setIsViewScaled(isScaled);
          if(!isAnimating && !isScaled) {
          // TODO -- why can't I fade the background here?
            const transX = Math.abs(tfn.translateX/deviceWidth);
            const transY = Math.abs(tfn.translateY/deviceHeight);
            var opacity = (1.0 - Math.max(transX, transY)) * 1.35;
            opacityVal.setValue(opacity >= 1.0 ? 1.0 : opacity);
          }
        }}>
          <View style={{flex: 1, justifyContent: 'center'}}>
            {props.children}
          </View>
      </ViewTransformer>
    </Animated.View>
  );

  return (
    <>
      {props.navigator ? (
        <View>
          {background}
          {content}
          {header}
        </View>
      ) : (
        <Modal
          visible={props.isOpen}
          transparent={true}
          onShow={() => {
            setAllowTransform(true);
          }}
          onRequestClose={() => {
            setAllowTransform(false);
            close()
          }}>
          {background}
          {content}
          {header}
        </Modal>
      )}
    </>
  );
};

LightboxOverlay.propTypes = {
  origin: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  springConfig: PropTypes.shape({
    tension: PropTypes.number,
    friction: PropTypes.number,
  }),
  backgroundColor: PropTypes.string,
  isOpen: PropTypes.bool,
  renderHeader: PropTypes.func,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  willClose: PropTypes.func,
  swipeToDismiss: PropTypes.bool,
};

LightboxOverlay.defaultProps = {
  springConfig: { tension: 30, friction: 7 },
  backgroundColor: "black",
};

export default LightboxOverlay;
