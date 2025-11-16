import React, { createContext, useState, useContext, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModalState {
  type: string | null;
  props: any;
}

interface ModalContextType {
  openModal: (type: string, props?: any) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    props: {}
  });

  const openModal = useCallback((type: string, props = {}) => {
    console.log(`[ModalContext] openModal called with type: "${type}"`, { props });
    setModalState({ type, props });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: null, props: {} });
  }, []);

  const renderModal = () => {
    const { type, props } = modalState;
    
    // For now, we'll implement a basic modal renderer. 
    // In a real implementation, we would import and render actual modal components
    switch (type) {
      case 'address':
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={closeModal}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text>Address Modal</Text>
                <TouchableOpacity style={styles.button} onPress={closeModal}>
                  <Text>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      case 'orderConfirmation':
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={closeModal}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text>Order Confirmation Modal</Text>
                <TouchableOpacity style={styles.button} onPress={closeModal}>
                  <Text>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      case 'cart':
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={true}
            onRequestClose={closeModal}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text>Cart Modal</Text>
                <TouchableOpacity style={styles.button} onPress={closeModal}>
                  <Text>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      default:
        return null;
    }
  };

  const value = {
    openModal,
    closeModal
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {renderModal()}
    </ModalContext.Provider>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: '#2196F3',
  },
});