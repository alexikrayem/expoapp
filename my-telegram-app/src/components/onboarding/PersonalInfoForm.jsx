import React from 'react';

const PersonalInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  const inputClassName = `w-full px-4 py-3 rounded-xl border ${errors ? 'border-slate-200' : 'border-slate-200'} focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-slate-900 bg-slate-50/50 hover:bg-white`;
  const labelClassName = "block text-right text-sm font-semibold text-slate-700 mb-2";
  const errorClassName = "text-red-500 text-xs mt-1 text-right";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse mb-6 border-b border-slate-100 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm ring-1 ring-blue-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <div className="text-right flex-grow">
          <h2 className="text-xl font-bold text-slate-900">المعلومات الشخصية</h2>
          <p className="text-slate-500 text-sm mt-1">يرجى ملء معلوماتك الشخصية الأساسية للتواصل</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className={labelClassName}>
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => onInputChange('full_name', e.target.value)}
              className={`${inputClassName} ${errors.full_name ? 'border-red-300 ring-red-100 bg-red-50' : ''}`}
              placeholder="الاسم الثلاثي"
            />
            {errors.full_name && <p className={errorClassName}>{errors.full_name}</p>}
          </div>

          <div>
            <label className={labelClassName}>
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => onInputChange('phone_number', e.target.value)}
              className={`${inputClassName} ${errors.phone_number ? 'border-red-300 ring-red-100 bg-red-50' : ''}`}
              placeholder="09xxxxxxxx"
              dir="ltr"
            />
            {errors.phone_number && <p className={errorClassName}>{errors.phone_number}</p>}
          </div>

          <div>
            <label className={labelClassName}>الجنس</label>
            <select
              value={formData.gender}
              onChange={(e) => onInputChange('gender', e.target.value)}
              className={inputClassName}
            >
              <option value="">اختر الجنس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>

          <div>
            <label className={labelClassName}>تاريخ الميلاد</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => onInputChange('date_of_birth', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>رقم الترخيص المهني</label>
            <input
              type="text"
              value={formData.professional_license_number}
              onChange={(e) => onInputChange('professional_license_number', e.target.value)}
              className={inputClassName}
              placeholder="اختياري"
            />
          </div>
        </div>

        {/* Section 2: Address */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <h3 className="text-base font-bold text-slate-800 mb-4 text-right">عنوان السكن</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className={labelClassName}>العنوان التفصيلي <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => onInputChange('address_line1', e.target.value)}
                className={inputClassName}
                placeholder="الحي، الشارع، البناء"
              />
              {errors.address_line1 && <p className={errorClassName}>{errors.address_line1}</p>}
            </div>

            <div>
              <label className={labelClassName}>المدينة <span className="text-red-500">*</span></label>
              <select
                value={formData.selected_city_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onInputChange('selected_city_id', val ? parseInt(val) : null);
                  const city = cities.find(c => c.id === parseInt(val));
                  if (city) onInputChange('city', city.name);
                }}
                className={inputClassName}
              >
                <option value="">اختر المدينة</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.city && <p className={errorClassName}>{errors.city}</p>}
            </div>

            <div>
              <label className={labelClassName}>عنوان إضافي</label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => onInputChange('address_line2', e.target.value)}
                className={inputClassName}
                placeholder="اختياري"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;