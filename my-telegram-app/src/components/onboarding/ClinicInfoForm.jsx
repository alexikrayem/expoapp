import React from 'react';
import LocationPicker from './LocationPicker';

const ClinicInfoForm = ({ formData, onInputChange, errors, cities = [] }) => {
  const inputClassName = `w-full px-4 py-3 rounded-xl border ${errors ? 'border-slate-200' : 'border-slate-200'} focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-slate-900 bg-slate-50/50 hover:bg-white`;
  const labelClassName = "block text-right text-sm font-semibold text-slate-700 mb-2";
  const errorClassName = "text-red-500 text-xs mt-1 text-right";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse mb-6 border-b border-slate-100 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm ring-1 ring-blue-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div className="text-right flex-grow">
          <h2 className="text-xl font-bold text-slate-900">بيانات العيادة</h2>
          <p className="text-slate-500 text-sm mt-1">أضف تفاصيل عيادتك لتظهر في نتائج البحث</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className={labelClassName}>
              اسم العيادة / المركز <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.clinic_name}
              onChange={(e) => onInputChange('clinic_name', e.target.value)}
              className={`${inputClassName} ${errors.clinic_name ? 'border-red-300 ring-red-100 bg-red-50' : ''}`}
              placeholder="مثال: عيادة الابتسامة"
            />
            {errors.clinic_name && <p className={errorClassName}>{errors.clinic_name}</p>}
          </div>

          <div>
            <label className={labelClassName}>
              هاتف العيادة <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.clinic_phone}
              onChange={(e) => onInputChange('clinic_phone', e.target.value)}
              className={`${inputClassName} ${errors.clinic_phone ? 'border-red-300 ring-red-100 bg-red-50' : ''}`}
              placeholder="رقم للتواصل"
              dir="ltr"
            />
            {errors.clinic_phone && <p className={errorClassName}>{errors.clinic_phone}</p>}
          </div>

          <div>
            <label className={labelClassName}>التخصص الرئيسي</label>
            <select
              value={formData.clinic_specialization}
              onChange={(e) => onInputChange('clinic_specialization', e.target.value)}
              className={inputClassName}
            >
              <option value="">اختر التخصص</option>
              <option value="general">طب أسنان عام</option>
              <option value="orthodontics">تقويم الأسنان</option>
              <option value="oral_surgery">جراحة الفم والفكين</option>
              <option value="pediatric">طب أسنان أطفال</option>
              <option value="periodontics">أمراض اللثة</option>
              <option value="prosthodontics">التعويضات السنية</option>
              <option value="cosmetic">تجميل الأسنان</option>
              <option value="implantology">زراعة الأسنان</option>
              <option value="dental_lab">مختبر أسنان</option>
              <option value="other">متعدد التخصصات</option>
            </select>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <h3 className="text-base font-bold text-slate-800 mb-4 text-right">عنوان وموقع العيادة</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>العنوان <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.clinic_address_line1}
                  onChange={(e) => onInputChange('clinic_address_line1', e.target.value)}
                  className={inputClassName}
                  placeholder="الشارع، البناء"
                />
              </div>
              <div>
                <label className={labelClassName}>المدينة</label>
                <select
                  value={formData.selected_city_id || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onInputChange('selected_city_id', val ? parseInt(val) : null);
                    const city = cities.find(c => c.id === parseInt(val));
                    if (city) {
                      onInputChange('clinic_city', city.name);
                      onInputChange('city', city.name); // sync main city too usually
                    }
                  }}
                  className={inputClassName}
                >
                  <option value="">اختر مدينة العيادة</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClassName}>تحديد الموقع على الخريطة</label>
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <LocationPicker
                  value={formData.clinic_coordinates ? JSON.parse(formData.clinic_coordinates) : null}
                  onChange={(coordinates) => onInputChange('clinic_coordinates', coordinates)}
                  onLocationSelect={(locationData) => {
                    Object.keys(locationData).forEach(key => onInputChange(key, locationData[key]));
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">اضغط على الخريطة لتحديد موقع العيادة بدقة</p>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClassName}>رقم ترخيص المنشأة (اختياري)</label>
          <input
            type="text"
            value={formData.clinic_license_number}
            onChange={(e) => onInputChange('clinic_license_number', e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
};

export default ClinicInfoForm;