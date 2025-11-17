import React from 'react';
import LocationPicker from './LocationPicker';

const ClinicInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-reverse space-x-4 rtl:space-x-reverse mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-800">معلومات العيادة</h2>
          <p className="text-gray-600 text-sm">يرجى ملء معلومات عيادتك أو مكتبك</p>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">معلومات العيادة الأساسية</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              اسم العيادة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.clinic_name}
              onChange={(e) => onInputChange('clinic_name', e.target.value)}
              className={`onboarding-input ${errors.clinic_name ? 'onboarding-input.error' : ''}`}
              placeholder="أدخل اسم العيادة"
            />
            {errors.clinic_name && (
              <p className="onboarding-error mt-1">{errors.clinic_name}</p>
            )}
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              هاتف العيادة <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.clinic_phone}
              onChange={(e) => onInputChange('clinic_phone', e.target.value)}
              className={`onboarding-input ${errors.clinic_phone ? 'onboarding-input.error' : ''}`}
              placeholder="رقم هاتف العيادة"
            />
            {errors.clinic_phone && (
              <p className="onboarding-error mt-1">{errors.clinic_phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">عنوان العيادة</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عنوان العيادة
            </label>
            <input
              type="text"
              value={formData.clinic_address_line1}
              onChange={(e) => onInputChange('clinic_address_line1', e.target.value)}
              className="onboarding-input"
              placeholder="العنوان الأول للعيادة"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عنوان إضافي للعيادة
            </label>
            <input
              type="text"
              value={formData.clinic_address_line2}
              onChange={(e) => onInputChange('clinic_address_line2', e.target.value)}
              className="onboarding-input"
              placeholder="العنوان الثاني للعيادة (اختياري)"
            />
          </div>

          <div className="form-row">
            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                مدينة العيادة
              </label>
              <select
                value={formData.selected_city_id || ''}
                onChange={(e) => {
                  const selectedCityId = e.target.value;
                  onInputChange('selected_city_id', selectedCityId ? parseInt(selectedCityId) : null);

                  // Auto-populate clinic_city and city fields based on the selected city
                  if (selectedCityId) {
                    const selectedCity = cities.find(city => city.id === parseInt(selectedCityId));
                    if (selectedCity) {
                      onInputChange('clinic_city', selectedCity.name || '');
                      onInputChange('city', selectedCity.name || '');
                    }
                  }
                }}
                className="onboarding-select"
              >
                <option value="">اختر مدينة العيادة</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                دولة العيادة
              </label>
              <input
                type="text"
                value={formData.clinic_country}
                onChange={(e) => onInputChange('clinic_country', e.target.value)}
                className="onboarding-input"
                placeholder="دولة العيادة"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">موقع العيادة على الخريطة</h3>

        <div className="space-y-4">
          <div>
            <LocationPicker
              value={formData.clinic_coordinates ? JSON.parse(formData.clinic_coordinates) : null}
              onChange={(coordinates) => onInputChange('clinic_coordinates', coordinates)}
              onLocationSelect={(locationData) => {
                // Update multiple fields based on location selection
                Object.keys(locationData).forEach(key => {
                  onInputChange(key, locationData[key]);
                });
              }}
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              رقم ترخيص العيادة
            </label>
            <input
              type="text"
              value={formData.clinic_license_number}
              onChange={(e) => onInputChange('clinic_license_number', e.target.value)}
              className="onboarding-input"
              placeholder="رقم ترخيص العيادة (إن وجد)"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              تخصص العيادة
            </label>
            <select
              value={formData.clinic_specialization}
              onChange={(e) => onInputChange('clinic_specialization', e.target.value)}
              className="onboarding-select"
            >
              <option value="">اختر تخصص العيادة</option>
              <option value="general">طب أسنان عام</option>
              <option value="orthodontics">تقويم الأسنان</option>
              <option value="oral_surgery">الجراحة الفموية</option>
              <option value="pediatric">طب أسنان الأطفال</option>
              <option value="periodontics">أمراض اللثة</option>
              <option value="endodontics">تاج الجذور</option>
              <option value="prosthodontics">تقويم الأسنان</option>
              <option value="cosmetic">تجميل الأسنان</option>
              <option value="other">آخر</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicInfoForm;