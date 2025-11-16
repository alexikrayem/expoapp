import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CitySelectionModalProps {
  onCitySelect: (cityId: string) => void;
}

const CitySelectionModal: React.FC<CitySelectionModalProps> = ({ onCitySelect }) => {
  const cities = [
    { id: '1', name: 'Dubai' },
    { id: '2', name: 'Abu Dhabi' },
    { id: '3', name: 'Sharjah' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your City</Text>
      {cities.map(city => (
        <TouchableOpacity 
          key={city.id} 
          style={styles.cityButton} 
          onPress={() => onCitySelect(city.id)}
        >
          <Text style={styles.cityText}>{city.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cityButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  cityText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CitySelectionModal;