import React from 'react';

const ProfessionalInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  const inputClassName = `w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-slate-900 bg-slate-50/50 hover:bg-white`;
  const labelClassName = "block text-right text-sm font-semibold text-slate-700 mb-2";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse mb-6 border-b border-slate-100 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm ring-1 ring-blue-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div className="text-right flex-grow">
          <h2 className="text-xl font-bold text-slate-900">المعلومات المهنية</h2>
          <p className="text-slate-500 text-sm mt-1">ساعدنا في تخصيص تجربتك بناءً على تخصصك</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClassName}>الوظيفة / التخصص</label>
          <select
            value={formData.professional_role}
            onChange={(e) => onInputChange('professional_role', e.target.value)}
            className={inputClassName}
          >
            <option value="">اختر المسمى الوظيفي</option>
            <option value="dentist">طبيب أسنان</option>
            <option value="dental_assistant">مساعد طبيب أسنان</option>
            <option value="dental_hygienist">أخصائي صحة فموية</option>
            <option value="dental_technician">فني أسنان</option>
            <option value="student">طالب طب أسنان</option>
            <option value="office_manager">مدير عيادة</option>
            <option value="other">آخر</option>
          </select>
        </div>

        <div>
          <label className={labelClassName}>سنوات الخبرة</label>
          <input
            type="number"
            min="0"
            max="60"
            value={formData.years_of_experience}
            onChange={(e) => onInputChange('years_of_experience', e.target.value)}
            className={inputClassName}
            placeholder="مثال: 5"
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className={labelClassName}>الخلفية التعليمية</label>
          <textarea
            value={formData.education_background}
            onChange={(e) => onInputChange('education_background', e.target.value)}
            className={`${inputClassName} min-h-[100px]`}
            placeholder="اذكر الجامعة، سنة التخرج، والدرجات العلمية..."
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className={labelClassName}>معلومات إضافية</label>
          <textarea
            value={formData.additional_info}
            onChange={(e) => onInputChange('additional_info', e.target.value)}
            className={`${inputClassName} min-h-[80px]`}
            placeholder="أي تفاصيل أخرى ترغب في مشاركتها..."
          />
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoForm;