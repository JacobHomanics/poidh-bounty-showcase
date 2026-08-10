import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import { Extrapolation, interpolate, useSharedValue } from 'react-native-reanimated';
import Carousel, {
  type ICarouselInstance,
  type TAnimationStyle,
} from 'react-native-reanimated-carousel';
import type { Claim } from '../types';
import { colors, radii } from '../theme';
import { ClaimTile } from './ClaimTile';

type Props = {
  claims: Claim[];
  style?: StyleProp<ViewStyle>;
  height?: number;
};

const ITEM_WIDTH_RATIO = 0.8;
const NEIGHBOR_SPACING_RATIO = 0.6;
const CAROUSEL_PAN_ACTIVE_OFFSET_X = 24;
const DEFAULT_HEIGHT = 360;

export function ClaimCarousel({ claims, style, height = DEFAULT_HEIGHT }: Props) {
  const carouselRef = useRef<ICarouselInstance>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevSignature, setPrevSignature] = useState('');

  const count = claims.length;
  const canLoop = count > 1;
  const dataSignature = claims.map((claim) => String(claim.claimId)).join('|');

  if (dataSignature !== prevSignature) {
    setPrevSignature(dataSignature);
    setActiveIndex(0);
  }

  const itemWidth = useMemo(
    () => Math.round(stageWidth * ITEM_WIDTH_RATIO),
    [stageWidth],
  );
  const baseCenter = useMemo(
    () => Math.round((stageWidth - itemWidth) / 2),
    [stageWidth, itemWidth],
  );
  const neighborSpacing = useMemo(
    () => itemWidth * NEIGHBOR_SPACING_RATIO,
    [itemWidth],
  );

  const baseCenterSv = useSharedValue(baseCenter);
  const neighborSpacingSv = useSharedValue(neighborSpacing);
  const itemWidthSv = useSharedValue(itemWidth);

  // Keep layout values in sync before paint so the active card starts centered.
  baseCenterSv.value = baseCenter;
  neighborSpacingSv.value = neighborSpacing;
  itemWidthSv.value = itemWidth;

  const handleConfigurePanGesture = useCallback((gesture: PanGesture) => {
    gesture.activeOffsetX([
      -CAROUSEL_PAN_ACTIVE_OFFSET_X,
      CAROUSEL_PAN_ACTIVE_OFFSET_X,
    ]);
  }, []);

  const animationStyle = useCallback<TAnimationStyle>(
    (value: number) => {
      'worklet';
      const translateX =
        baseCenterSv.value +
        interpolate(
          value,
          [-1, 0, 1],
          [-neighborSpacingSv.value, 0, neighborSpacingSv.value],
        );
      const scale = interpolate(
        value,
        [-1, 0, 1],
        [0.84, 1, 0.84],
        Extrapolation.CLAMP,
      );
      const rotateY = `${interpolate(
        value,
        [-1, 0, 1],
        [-42, 0, 42],
        Extrapolation.CLAMP,
      )}deg`;
      const opacity = interpolate(
        value,
        [-2, -1, 0, 1, 2],
        [0, 0.55, 1, 0.55, 0],
        Extrapolation.CLAMP,
      );
      const zIndex = Math.round(
        interpolate(Math.abs(value), [0, 1, 2], [200, 100, 0], Extrapolation.CLAMP),
      );
      return {
        transform: [
          { perspective: Math.max(itemWidthSv.value * 2.5, 1) },
          { translateX },
          { rotateY },
          { scale },
        ],
        opacity,
        zIndex,
      };
    },
    [baseCenterSv, itemWidthSv, neighborSpacingSv],
  );

  const isReady = stageWidth > 0 && itemWidth > 0;
  const carouselKey = `${dataSignature}:${stageWidth}x${height}`;

  return (
    <View style={[styles.root, { height }, style]}>
      <View
        style={styles.stage}
        onLayout={(e) => {
          const width = Math.round(e.nativeEvent.layout.width);
          setStageWidth((current) => (current === width ? current : width));
        }}
      >
        {isReady ? (
          <Carousel
            key={carouselKey}
            ref={carouselRef}
            style={{ width: stageWidth, height }}
            width={itemWidth}
            height={height}
            data={claims}
            loop={canLoop}
            autoFillData={canLoop}
            snapEnabled
            pagingEnabled
            windowSize={count}
            onSnapToItem={setActiveIndex}
            onConfigurePanGesture={handleConfigurePanGesture}
            customAnimation={animationStyle}
            renderItem={({ item, index }) => (
              <View
                style={styles.itemWrap}
                pointerEvents={index === activeIndex ? 'auto' : 'none'}
              >
                <ClaimTile claim={item} fill />
              </View>
            )}
          />
        ) : null}

        {canLoop && isReady ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous claim"
              hitSlop={8}
              style={[styles.chevronOuter, { left: 0 }]}
              onPress={() => carouselRef.current?.prev()}
            >
              <View style={styles.chevronHit}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next claim"
              hitSlop={8}
              style={[styles.chevronOuter, { right: 0 }]}
              onPress={() => carouselRef.current?.next()}
            >
              <View style={styles.chevronHit}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </View>
            </Pressable>
          </>
        ) : null}

        {count > 0 ? (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>
              {Math.min(activeIndex + 1, count)} / {count}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
  },
  stage: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chevronOuter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 500,
  },
  chevronHit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 500,
  },
  badgeText: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,16,24,0.72)',
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
});
