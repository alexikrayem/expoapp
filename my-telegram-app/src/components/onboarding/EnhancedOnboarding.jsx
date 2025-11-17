import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/userService';
import { cityService } from '../../services/cityService';
import PersonalInfoForm from './PersonalInfoForm';
import ClinicInfoForm from './ClinicInfoForm';
import ProfessionalInfoForm from './ProfessionalInfoForm';
import CompletionStep from './CompletionStep';
import './Onboarding.css';

const EnhancedOnboarding = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1); // 1: Personal, 2: Clinic, 3: Professional, 4: Completion
  const [formData, setFormData] = useState({
    // Personal Info
    full_name: '',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    date_of_birth: '',
    gender: '',
    professional_license_number: '',

    // Clinic Info
    clinic_name: '',
    clinic_phone: '',
    clinic_address_line1: '',
    clinic_address_line2: '',
    clinic_city: '',
    clinic_country: '',
    clinic_coordinates: '',
    clinic_license_number: '',
    clinic_specialization: '',
    selected_city_id: null,

    // Professional Info
    professional_role: '',
    years_of_experience: '',
    education_background: '',
    additional_info: '',
  });
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch existing user profile data and cities
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingCities(true);

        // Fetch both user profile and cities in parallel
        const [profileData, citiesData] = await Promise.all([
          userService.getProfile(),
          cityService.getCities()
        ]);

        // Update form with existing data
        setFormData(prev => ({
          ...prev,
          full_name: profileData.full_name || '',
          phone_number: profileData.phone_number || '',
          address_line1: profileData.address_line1 || '',
          address_line2: profileData.address_line2 || '',
          city: profileData.city || '',
          clinic_name: profileData.clinic_name || '',
          clinic_phone: profileData.clinic_phone || '',
          clinic_address_line1: profileData.clinic_address_line1 || '',
          clinic_address_line2: profileData.clinic_address_line2 || '',
          clinic_city: profileData.clinic_city || '',
          clinic_country: profileData.clinic_country || '',
          clinic_coordinates: profileData.clinic_coordinates || '',
          clinic_license_number: profileData.clinic_license_number || '',
          clinic_specialization: profileData.clinic_specialization || '',
          professional_role: profileData.professional_role || '',
          years_of_experience: profileData.years_of_experience || '',
          education_background: profileData.education_background || '',
          date_of_birth: profileData.date_of_birth || '',
          gender: profileData.gender || '',
          professional_license_number: profileData.professional_license_number || '',
          selected_city_id: profileData.selected_city_id || null,
          additional_info: profileData.additional_info || '',
        }));

        // Set available cities
        setCities(citiesData || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    loadInitialData();
  }, []);

  const steps = [
    { id: 1, title: 'المعلومات الشخصية', component: PersonalInfoForm },
    { id: 2, title: 'معلومات العيادة', component: ClinicInfoForm },
    { id: 3, title: 'المعلومات المهنية', component: ProfessionalInfoForm },
    { id: 4, title: 'الانتهاء', component: CompletionStep }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateStep = (stepId) => {
    const newErrors = {};

    if (stepId === 1) {
      // Validate personal info
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'الاسم مطلوب';
      }
      if (!formData.phone_number.trim()) {
        newErrors.phone_number = 'رقم الهاتف مطلوب';
      } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.phone_number)) {
        newErrors.phone_number = 'رقم الهاتف غير صحيح';
      }
    } else if (stepId === 2) {
      // Validate clinic info
      if (!formData.clinic_name.trim()) {
        newErrors.clinic_name = 'اسم العيادة مطلوب';
      }
      if (!formData.clinic_phone.trim()) {
        newErrors.clinic_phone = 'هاتف العيادة مطلوب';
      } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.clinic_phone)) {
        newErrors.clinic_phone = 'رقم هاتف العيادة غير صحيح';
      }

    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced validation to check if profile is complete
  const isProfileComplete = () => {
    return (
      formData.full_name?.trim() &&
      formData.phone_number?.trim() &&
      formData.clinic_name?.trim() &&
      formData.clinic_phone?.trim() &&
      formData.selected_city_id
    );
  };

  // Enhanced validation to check if all required fields are filled
  const validateAllRequiredFields = () => {
    const newErrors = {};

    // Personal Info
    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'الاسم مطلوب';
    }
    if (!formData.phone_number?.trim()) {
      newErrors.phone_number = 'رقم الهاتف مطلوب';
    } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'رقم الهاتف غير صحيح';
    }

    // Clinic Info
    if (!formData.clinic_name?.trim()) {
      newErrors.clinic_name = 'اسم العيادة مطلوب';
    }
    if (!formData.clinic_phone?.trim()) {
      newErrors.clinic_phone = 'هاتف العيادة مطلوب';
    } else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(formData.clinic_phone)) {
      newErrors.clinic_phone = 'رقم هاتف العيادة غير صحيح';
    }

    if (!formData.selected_city_id) {
      newErrors.selected_city_id = 'يجب اختيار المدينة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step < 4) {
      if (validateStep(step)) {
        setStep(prev => prev + 1);
      }
    } else {
      // Last step - validate all required fields before saving
      if (!validateAllRequiredFields()) {
        // Error messages already set by validateAllRequiredFields
        return;
      }

      setLoading(true);
      try {
        // Prepare the data to send to the backend
        // Make sure selected_city_id is properly formatted (as a number or null)
        // and clinic_coordinates is properly formatted as JSON if provided
        let clinicCoordinates = null;
        if (formData.clinic_coordinates) {
          if (typeof formData.clinic_coordinates === 'string') {
            try {
              // Try to parse if it's already a JSON string
              clinicCoordinates = JSON.parse(formData.clinic_coordinates);
            } catch (e) {
              // If it's not valid JSON, let's try to parse coordinates like "lat,lng"
              const coords = formData.clinic_coordinates.split(',');
              if (coords.length === 2) {
                const lat = parseFloat(coords[0].trim());
                const lng = parseFloat(coords[1].trim());
                if (!isNaN(lat) && !isNaN(lng)) {
                  clinicCoordinates = { lat, lng };
                }
              }
              // If parsing fails, send as null to avoid DB error
              if (!clinicCoordinates) {
                clinicCoordinates = null;
              }
            }
          } else if (typeof formData.clinic_coordinates === 'object') {
            // If it's already an object (from LocationPicker), use it directly
            clinicCoordinates = formData.clinic_coordinates;
          }
        }

        const payload = {
          ...formData,
          selected_city_id: formData.selected_city_id ? parseInt(formData.selected_city_id) : null,
          clinic_coordinates: clinicCoordinates
        };

        await userService.updateProfile(payload);
        onComplete();
      } catch (error) {
        console.error('Error saving profile:', error);
        setErrors({ general: 'حدث خطأ أثناء حفظ المعلومات. يرجى المحاولة مرة أخرى.' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Enhanced validation for form navigation
  const canNavigateNext = () => {
    if (step === 1) {
      // For step 1, check if personal info is valid before proceeding
      return validateStep(1);
    } else if (step === 2) {
      // For step 2, check if clinic info is valid before proceeding
      return validateStep(2);
    } else if (step === 3) {
      // For step 3, user can always go to completion
      return true;
    }
    return true;
  };

  const handleNextWithValidation = async () => {
    if (step < 4) {
      if (canNavigateNext()) {
        setStep(prev => prev + 1);
      }
    } else {
      // Last step - validate all required fields before saving
      if (!validateAllRequiredFields()) {
        // Error messages already set by validateAllRequiredFields
        return;
      }

      // If validation passes, run the save logic directly
      setLoading(true);
      try {
        // Prepare the data to send to the backend
        // Make sure selected_city_id is properly formatted (as a number or null)
        // and clinic_coordinates is properly formatted as JSON if provided
        let clinicCoordinates = null;
        if (formData.clinic_coordinates) {
          if (typeof formData.clinic_coordinates === 'string') {
            try {
              // Try to parse if it's already a JSON string
              clinicCoordinates = JSON.parse(formData.clinic_coordinates);
            } catch (e) {
              // If it's not valid JSON, let's try to parse coordinates like "lat,lng"
              const coords = formData.clinic_coordinates.split(',');
              if (coords.length === 2) {
                const lat = parseFloat(coords[0].trim());
                const lng = parseFloat(coords[1].trim());
                if (!isNaN(lat) && !isNaN(lng)) {
                  clinicCoordinates = { lat, lng };
                }
              }
              // If parsing fails, send as null to avoid DB error
              if (!clinicCoordinates) {
                clinicCoordinates = null;
              }
            }
          } else if (typeof formData.clinic_coordinates === 'object') {
            // If it's already an object (from LocationPicker), use it directly
            clinicCoordinates = formData.clinic_coordinates;
          }
        }

        const payload = {
          ...formData,
          selected_city_id: formData.selected_city_id ? parseInt(formData.selected_city_id) : null,
          clinic_coordinates: clinicCoordinates
        };

        await userService.updateProfile(payload);
        onComplete();
      } catch (error) {
        console.error('Error saving profile:', error);
        setErrors({ general: 'حدث خطأ أثناء حفظ المعلومات. يرجى المحاولة مرة أخرى.' });
      } finally {
        setLoading(false);
      }
    }
  };


  const handlePrevious = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    // Check if required fields are filled before allowing skip
    if (!isProfileComplete()) {
      alert('يجب ملء جميع الحقول المطلوبة قبل تخطي النموذج.');
      return;
    }
    onSkip();
  };

  const CurrentStepComponent = steps.find(s => s.id === step)?.component;
  const progress = ((step - 1) / (steps.length - 1)) * 100;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-blue-50 via-white to-cyan-50 font-[Montaserat] overflow-hidden"
    >
      <div className="relative w-full max-w-md h-[90vh] flex flex-col items-center justify-between text-center px-4 py-6 bg-white shadow-2xl rounded-2xl mx-4">
        {/* Header */}
        <div className="w-full px-4">
          {/* Placeholder for consistent spacing when progress is moved to bottom */}
        </div>

        {/* Step content */}
        <div className="flex-1 w-full px-4 overflow-y-auto pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {CurrentStepComponent && (
                <CurrentStepComponent
                  formData={formData}
                  onInputChange={handleInputChange}
                  errors={errors}
                  cities={cities}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots at bottom */}
        <div className="w-full px-6 mb-2">
          <div className="flex justify-center mb-3">
            <div className="flex space-x-3">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 transition-all duration-300 ${
                    index === step - 1
                      ? 'w-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full' // Active pill shape
                      : index < step
                        ? 'w-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full' // Completed
                        : 'w-3 bg-gray-300 rounded-full' // Not completed
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="w-full px-6">
          {errors.general && (
            <div className="text-red-500 text-sm mb-3 text-center bg-red-50 p-3 rounded-lg">
              {errors.general}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-4">
            {step > 1 && (
              <button
                onClick={handlePrevious}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition disabled:opacity-50 shadow-sm"
              >
                السابق
              </button>
            )}

            {!step > 1 && <div className="w-1/2" />} {/* Spacer for alignment */}

            {step < 4 ? (
              <button
                onClick={handleNextWithValidation}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الحفظ...
                  </span>
                ) : 'التالي'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  تخطي
                </button>
                <button
                  onClick={handleNextWithValidation}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50 shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الحفظ...
                    </span>
                  ) : 'اكتمال'}
                </button>
              </>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-gray-500 text-sm hover:text-gray-700 hover:underline disabled:opacity-50"
            >
              تخطي النموذج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOnboarding;