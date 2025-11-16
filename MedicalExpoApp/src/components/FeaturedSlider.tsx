import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  type: 'product' | 'deal' | 'supplier' | 'list';
  listType?: 'products' | 'deals';
}

interface FeaturedSliderProps {
  items: FeaturedItem[];
  isLoading: boolean;
  onSlideClick: (item: FeaturedItem) => void;
}

const FeaturedSlider: React.FC<FeaturedSliderProps> = ({ items, isLoading, onSlideClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard} />
        <View style={styles.loadingCard} />
        <View style={styles.loadingCard} />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (SCREEN_WIDTH * 0.75)); // Adjust for card width
    setActiveIndex(index);
  };

  const renderCard = (item: FeaturedItem, index: number) => {
    const isCurrent = index === activeIndex;
    return (
      <TouchableOpacity
        key={`${item.type}-${item.id}`}
        style={[styles.card, isCurrent ? styles.activeCard : styles.inactiveCard]}
        onPress={() => onSlideClick(item)}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.imageUrl || 'https://placehold.co/300x200?text=No+Image' }} 
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            {item.type === 'list' && item.listType && (
              <Text style={styles.listType}>
                {item.listType === 'products' ? '📦 Products' : '🎁 Deals'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_WIDTH * 0.75} // Match card width
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContainer}
      >
        {items.map((item, index) => renderCard(item, index))}
      </ScrollView>
      
      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex ? styles.paginationDotActive : styles.paginationDotInactive
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  card: {
    width: SCREEN_WIDTH * 0.75,
    height: 250,
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeCard: {
    transform: [{ scale: 1 }],
  },
  inactiveCard: {
    transform: [{ scale: 0.9 }],
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  listType: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#3b82f6',
  },
  paginationDotInactive: {
    backgroundColor: '#d1d5db',
  },
  loadingContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  loadingCard: {
    width: SCREEN_WIDTH * 0.75,
    height: 250,
    marginHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
});

export default FeaturedSlider;