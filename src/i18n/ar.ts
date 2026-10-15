/**
 * Arabic source strings. This object is the source of truth for the key set —
 * `en.ts` and `de.ts` are typed against it, so a key added here that is not
 * translated is a type error rather than a blank label at runtime.
 */
export const ar = {
  appName: 'رنموا للرب',

  tabs: {
    home: 'الرئيسية',
    recents: 'الحديثة',
    help: 'مساعدة',
    more: 'المزيد',
  },

  home: {
    pickHint: 'اضغط على الكتاب لفتحه',
  },

  library: {
    title: 'الترنيمات',
    count: 'عدد الترنيمات',
    byNumber: 'بترقيمها',
    alphabetical: 'أبجديًا',
  },

  book: {
    choose: 'الكتاب',
    main: 'رنموا للرب',
    taranim: 'ترنيمات روحية',
  },

  search: {
    placeholder: 'ابحث في الترنيمات...',
    inBook: 'البحث في',
    clear: 'مسح',
    noResults: 'لا توجد نتائج',
    noResultsHint: 'جرّب كلمة أخرى أو ابحث برقم الترنيمة',
    resultCount: 'نتيجة',
  },

  reader: {
    settings: 'إعدادات النص',
    info: 'معلومات الترنيمة',
    similar: 'ترنيمات مشابهة',
    share: 'مشاركة',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    previous: 'الترنيمة السابقة',
    next: 'الترنيمة التالية',
    increaseFont: 'تكبير الخط',
    decreaseFont: 'تصغير الخط',
    fontSize: 'حجم الخط',
    fontFamily: 'نوع الخط',
    verseOf: 'المقطع',
    translation: 'الترجمة',
    jump: 'انتقال',
    jumpPlaceholder: 'ابحث برقم أو كلمة...',
    tools: 'الأدوات',
    refrain: 'القرار',
    stanzas: 'انتقال إلى مقطع',
  },

  info: {
    meter: 'مقياس الكلام',
    missing: 'غير متوفر',
  },

admin: {
    title: 'الإدارة',
    pinTitle: 'أدخل رمز الإدارة',
    pinPlaceholder: 'الرمز',
    unlock: 'فتح',
    wrongPin: 'رمز خاطئ',
    editHymn: 'تحرير ترنيمة',
    pickNumber: 'رقم الترنيمة',
    open: 'فتح',
    notFound: 'الترنيمة غير موجودة',
    save: 'حفظ التغييرات',
    saved: 'تم الحفظ على هذا الجهاز فقط',
    newPin: 'رمز جديد (4 أرقام)',
    pinSaved: 'تم تغيير الرمز',
    publishTitle: 'النشر السحابي',
    publishNow: 'نشر التغييرات',
    publishing: 'جارٍ النشر...',
    published: 'تم الحفظ في السحابة — يظهر فورًا على كل الأجهزة',
    publishFailed: 'فشل الحفظ — تحقق من تسجيل الدخول والإنترنت',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    signedInAs: 'مسجل الدخول باسم',
    authFailed: 'بيانات الدخول غير صحيحة',
    notSignedIn: 'سجّل الدخول أولاً',
    noCloud: 'الحفظ السحابي غير مهيأ بعد',
    noChanges: 'لا توجد تغييرات بعد',
    errBlank: 'العنوان والسطور لا يمكن أن تكون فارغة',
    errCount: 'عدد المقاطع والسطور يجب أن يبقى كما هو (التعديل البنيوي من الكمبيوتر)',
    markVerified: 'وضع علامة "تمت المراجعة"',
    verified: 'تمت المراجعة',
    deleteHymn: 'حذف ترنيمة',
    deleteConfirmTitle: 'حذف الترنيمة؟',
    deleted: 'تم الحذف',
    reviewTitle: 'مراجعة الترجمات',
    filterAll: 'الكل',
    filterDrafts: 'مسودات فقط',
    reviewEmpty: 'لا توجد ترنيمات مطابقة لهذا التصفية',
    errNumber: 'رقم مستخدم أو غير صالح',
    author: 'المؤلف',
    authorOriginal: 'المؤلف الأصلي',
    chorus: 'القرار',
    hymnTitle: 'العنوان',
    titleEn: 'العنوان بالإنجليزية',
    chorusEn: 'القرار بالإنجليزية',
    translationEn: 'الترجمة الإنجليزية',
    titleDe: 'العنوان بالألمانية',
    chorusDe: 'القرار بالألمانية',
    translationDe: 'الترجمة الألمانية',
    addHymn: 'إضافة ترنيمة جديدة',
    hymnNumber: 'رقم الترنيمة',
    stanzaLine: 'سطر المقطع',
    backToAdmin: 'العودة للإدارة',
    errExists: 'الترنيمة موجودة بالفعل',
    findNextNumber: 'إيجاد الرقم التالي المتاح',
  },

  structure: {
    title: 'مقياس الكلام',
    subtitle: 'الترنيمات المتشابهة في مقياس الكلام',
    empty: 'لا توجد ترنيمات مصنفة',
    unmapped: 'مقاييس أخرى',
  },

  favorites: {
    title: 'الترنيمات المفضلة',
    empty: 'لا توجد ترنيمات مفضلة',
    emptyHint: 'اضغط على النجمة في أي ترنيمة لإضافته هنا',
  },

  recents: {
    title: 'الترنيمات الأخيرة',
    empty: 'لا توجد ترنيمات مقروءة',
    emptyHint: 'الترنيمات التي تفتحها ستظهر هنا',
    clear: 'مسح السجل',
  },

  settings: {
    title: 'الإعدادات',
    appearance: 'المظهر',
    theme: 'السمة',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    themeSystem: 'حسب النظام',
    appFontSize: 'حجم خط التطبيق',
    readerFontSize: 'حجم خط الترنيمة',
    data: 'البيانات',
    about: 'عن التطبيق',
    version: 'الإصدار',
  },

  help: {
    title: 'دليل المستخدم',
    video: {
      title: 'شرح بالفيديو',
      body: 'شاهد كيف تستخدم التطبيق خطوة بخطوة — بدون قراءة.',
      play: 'تشغيل الشرح',
      youtube: 'يوتيوب',
      soon: 'قريبًا',
    },
    search: {
      title: 'البحث',
      body: 'ابحث برقم الترنيمة أو بأي جزء من كلماتها، مع التشكيل أو بدونه.',
    },
    browse: {
      title: 'تصفح الترنيمات',
      body: 'تصفح جميع الترنيمات مرتبة برقمها، أو رتّبها أبجديًا.',
    },
    fullscreen: {
      title: 'عرض ملء الشاشة',
      body: 'اضغط على أيقونة ملء الشاشة لإخفاء القوائم وقراءة الترنيمة وحدها.',
    },
    share: {
      title: 'المشاركة',
      body: 'شارك الترنيمة أو مقطعًا منها عبر أي تطبيق على جهازك.',
    },
  },

  more: {
    title: 'المزيد',
    structure: 'مقياس الكلام',
    favorites: 'الترنيمات المفضلة',
    settings: 'الإعدادات',
    admin: 'الإدارة',
    rateApp: 'تقييم التطبيق',
    shareApp: 'مشاركة التطبيق',
    shareAppMessage: 'تطبيق رنموا للرب — كتابا الترانيم: رنموا للرب وترنيمات روحية',
    contactUs: 'تواصل معنا',
    notConfigured: 'هذه الميزة غير مهيأة بعد',
  },

  common: {
    back: 'رجوع',
    close: 'إغلاق',
    cancel: 'إلغاء',
    ok: 'حسنًا',
    loading: 'جارٍ التحميل...',
    hymnNumber: 'الترنيمة',
    notFound: 'لم يتم العثور على هذه الترنيمة',
    arShort: 'عر',
    enShort: 'EN',
    deShort: 'DE',
  },
} as const;

export type Dictionary = typeof ar;
export type TranslationKey = DeepKeys<Dictionary>;

/** Dotted-path key union, e.g. "reader.increaseFont". */
type DeepKeys<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${DeepKeys<T[K]>}` }[keyof T & string];

/**
 * A partially translated locale. Values wrapped in `todo()` render in-app with
 * a marker so an untranslated string is obvious during testing.
 */
export type PartialDictionary = { [K in TranslationKey]: string };
