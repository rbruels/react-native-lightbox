import React, { Component, useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewTransformer from "react-native-easy-view-transformer";

const WINDOW_WIDTH = Dimensions.get("window").width;
const WINDOW_HEIGHT = Dimensions.get("window").height;
const DRAG_DISMISS_THRESHOLD_X = 120;
const DRAG_DISMISS_THRESHOLD_Y = 250;
const isIOS = Platform.OS === "ios";

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
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
    width: WINDOW_WIDTH,
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
  },
});

const LightboxOverlay = (props) => {
  const _panResponder = useRef();
  const panX= useRef(new Animated.Value(0));
  const panY= useRef(new Animated.Value(0));
  const openVal = useRef(new Animated.Value(0));

  const [isOpen, setIsOpen] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isViewScaled, setIsViewScaled] = useState(false);
  const [panningDir, setPanningDir] = useState('x');
  const [target, setTarget] = useState({
    x: 0,
    y: 0,
    opacity: 1,
  });

  useEffect(() => {
    _panResponder.current = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => !isAnimating && gestureState.numberActiveTouches == 1,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating && gestureState.numberActiveTouches == 1,
      onMoveShouldSetPanResponder: (evt, gestureState) => !isAnimating && gestureState.numberActiveTouches == 1,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating && gestureState.numberActiveTouches == 1,

      onPanResponderGrant: (evt, gestureState) => {
        panX.current.setValue(0);
        panY.current.setValue(0);
        setPanningDir('x');
        setIsPanning(true);
      },
      onPanResponderMove: (evt, gestureState) => { 
        setPanningDir(Math.abs(gestureState.dx) > Math.abs(gestureState.dy) ? 'x' : 'y'); 
        Animated.event([null, { 
          dy: panY.current, 
          dx: panX.current 
        }], {
          useNativeDriver: false,
        })(evt, gestureState);
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dy) > DRAG_DISMISS_THRESHOLD_Y || Math.abs(gestureState.dx) > DRAG_DISMISS_THRESHOLD_X) {
          setIsPanning(false);
          setTarget({
            y: gestureState.dy,
            x: gestureState.dx,
            opacity: 1 - Math.abs(Math.max(gestureState.dy / WINDOW_HEIGHT, gestureState.dx / WINDOW_WIDTH)),
          });
          close();
        } else {
          Animated.parallel([
            Animated.spring(panX.current, {
              toValue: 0,
              ...props.springConfig,
              useNativeDriver: false,
            }),
            Animated.spring(panY.current, {
              toValue: 0,
              ...props.springConfig,
              useNativeDriver: false,
            })
          ]).start(() => setIsPanning(false));
        }
      },
    });
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

    panX.current.setValue(0);
    panY.current.setValue(0);

    setIsAnimating(true);
    setIsOpen(true);
    setTarget({
      x: 0,
      y: 0,
      opacity: 1,
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

  let handlers;
  if (props.swipeToDismiss && _panResponder.current && !isViewScaled) {
    handlers = _panResponder.current.panHandlers;
  }

  let dragStyle;
  if (isPanning) {
    dragStyle = {
      top: panY.current,
      left: panX.current
    };
    var maxDimension = WINDOW_WIDTH;
    var pan = panX;
    if(panningDir == 'y') {
      maxDimension = WINDOW_HEIGHT;
      pan = panY;
    }
    lightboxOpacityStyle.opacity = pan.current.interpolate({
      inputRange: [-maxDimension, 0, maxDimension],
      outputRange: [0, 1, 0],
    });
  }

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
        outputRange: [props.origin.width, WINDOW_WIDTH],
      }),
      height: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.height, WINDOW_HEIGHT],
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
    <Animated.View style={[openStyle, dragStyle]} {...handlers}>
      <ViewTransformer
        style={{backgroundColor: 'purple'}}
        maxScale={2}
        enableResistance={false}
        onViewTransformed={(tfn) => {
          setIsViewScaled(tfn.scale !== 1.0);
        }}
      >
      {props.children}
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
          onRequestClose={() => close()}
        >
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
