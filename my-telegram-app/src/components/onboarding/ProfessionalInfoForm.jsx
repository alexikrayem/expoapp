import React from 'react';

const ProfessionalInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-reverse space-x-4 rtl:space-x-reverse mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-800">المعلومات المهنية</h2>
          <p className="text-gray-600 text-sm">يرجى ملء معلوماتك المهنية وخبراتك</p>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">المعلومات المهنية</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              الوظيفة في العيادة
            </label>
            <select
              value={formData.professional_role}
              onChange={(e) => onInputChange('professional_role', e.target.value)}
              className="onboarding-select"
            >
              <option value="">اختر وظيفتك</option>
              <option value="dentist">طبيب أسنان</option>
              <option value="dental_assistant">مساعد طبيب أسنان</option>
              <option value="dental_hygienist">أخصائي صحة فموية</option>
              <option value="office_manager">مدير مكتب</option>
              <option value="receptionist">موظف استقبال</option>
              <option value="other">آخر</option>
            </select>
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عدد سنوات الخبرة
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={formData.years_of_experience}
              onChange={(e) => onInputChange('years_of_experience', e.target.value)}
              className="onboarding-input"
              placeholder="عدد سنوات الخبرة في مجال طب الأسنان"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">الخلفية التعليمية</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              الخلفية التعليمية
            </label>
            <textarea
              value={formData.education_background}
              onChange={(e) => onInputChange('education_background', e.target.value)}
              className="onboarding-textarea"
              placeholder="الدرجة العلمية، الجامعة، التخصص"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              معلومات إضافية
            </label>
            <textarea
              value={formData.additional_info}
              onChange={(e) => onInputChange('additional_info', e.target.value)}
              className="onboarding-textarea"
              placeholder="أي معلومات إضافية ترغب في مشاركتها"
              rows="3"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoForm;