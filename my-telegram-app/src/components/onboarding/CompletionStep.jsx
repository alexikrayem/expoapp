import React from 'react';

const CompletionStep = ({ formData, onInputChange, errors, cities = [] }) => {
  // Find the selected city name
  const selectedCity = cities.find(city => city.id === formData.selected_city_id);
  const cityName = selectedCity ? selectedCity.name : formData.city || 'غير محدد';

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex items-center space-x-reverse space-x-4 rtl:space-x-reverse mb-6 w-full px-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">تم إكمال الملف بنجاح!</h2>
          <p className="text-gray-600 text-sm">لقد أكملت معلومات ملفك الشخصي</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 text-right border border-blue-100 shadow-sm">
        <p className="text-blue-700 font-bold mb-4 text-center">ملخص المعلومات</p>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">الاسم:</span>
            <span className="font-medium text-gray-800">{formData.full_name || 'غير محدد'}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">اسم العيادة:</span>
            <span className="font-medium text-gray-800">{formData.clinic_name || 'غير محدد'}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">الوظيفة:</span>
            <span className="font-medium text-gray-800">{formData.professional_role || 'غير محدد'}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">المدينة:</span>
            <span className="font-medium text-gray-800">{cityName}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">الهاتف:</span>
            <span className="font-medium text-gray-800">{formData.phone_number || 'غير محدد'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionStep;