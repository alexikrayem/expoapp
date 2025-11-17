import React from 'react';

const PersonalInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-reverse space-x-4 rtl:space-x-reverse mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-800">المعلومات الشخصية</h2>
          <p className="text-gray-600 text-sm">يرجى ملء معلوماتك الشخصية الأساسية</p>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">المعلومات الأساسية</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => onInputChange('full_name', e.target.value)}
              className={`onboarding-input ${errors.full_name ? 'onboarding-input.error' : ''}`}
              placeholder="أدخل الاسم الكامل"
            />
            {errors.full_name && (
              <p className="onboarding-error mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => onInputChange('phone_number', e.target.value)}
              className={`onboarding-input ${errors.phone_number ? 'onboarding-input.error' : ''}`}
              placeholder="أدخل رقم الهاتف"
            />
            {errors.phone_number && (
              <p className="onboarding-error mt-1">{errors.phone_number}</p>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">عنوان السكن</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عنوان السكن
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => onInputChange('address_line1', e.target.value)}
              className="onboarding-input"
              placeholder="العنوان الأول"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عنوان إضافي
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => onInputChange('address_line2', e.target.value)}
              className="onboarding-input"
              placeholder="العنوان الثاني (اختياري)"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              المدينة
            </label>
            <select
              value={formData.selected_city_id || ''}
              onChange={(e) => {
                const selectedCityId = e.target.value;
                onInputChange('selected_city_id', selectedCityId ? parseInt(selectedCityId) : null);

                // Auto-populate city field based on the selected city
                if (selectedCityId) {
                  const selectedCity = cities.find(city => city.id === parseInt(selectedCityId));
                  if (selectedCity) {
                    onInputChange('city', selectedCity.name || '');
                  }
                } else {
                  onInputChange('city', ''); // Clear city if no selection
                }
              }}
              className="onboarding-select"
            >
              <option value="">اختر مدينتك</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">المعلومات الشخصية</h3>

        <div className="form-row">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              تاريخ الميلاد
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => onInputChange('date_of_birth', e.target.value)}
              className="onboarding-input"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              الجنس
            </label>
            <select
              value={formData.gender}
              onChange={(e) => onInputChange('gender', e.target.value)}
              className="onboarding-select"
            >
              <option value="">اختر الجنس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
              <option value="other">آخر</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">المعلومات المهنية</h3>

        <div>
          <label className="block text-right text-sm font-medium text-gray-700 mb-2">
            رقم الترخيص المهني
          </label>
          <input
            type="text"
            value={formData.professional_license_number}
            onChange={(e) => onInputChange('professional_license_number', e.target.value)}
            className="onboarding-input"
            placeholder="رقم الترخيص (إن وجد)"
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;