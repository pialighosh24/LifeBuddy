export interface LanguageItem {
  id: string;
  name: string;
  nativeName: string;
  subLabel: string;
  code: string; // TTS voice code
  greeting: string;
  script: string;
  symbol: string;
  isRTL?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    subLabel: 'Universal & Assistive',
    code: 'en-IN',
    greeting: 'Welcome to Udaya. A brighter tomorrow for everyone.',
    script: 'Latin',
    symbol: 'Aa',
    isRTL: false,
  },
  {
    id: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    subLabel: 'उत्तर एवं मध्य भारत',
    code: 'hi-IN',
    greeting: 'उदय में आपका स्वागत है। सबके लिए एक उज्ज्वल कल।',
    script: 'Devanagari',
    symbol: 'अ',
    isRTL: false,
  },
  {
    id: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    subLabel: 'পশ্চিমবঙ্গ ও ত্রিপুরা',
    code: 'bn-IN',
    greeting: 'উদয়ে আপনাকে স্বাগতম। সবার জন্য এক উজ্জ্বল ভবিষ্যৎ।',
    script: 'Bengali',
    symbol: 'অ',
    isRTL: false,
  },
  {
    id: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    subLabel: 'தமிழ்நாடு',
    code: 'ta-IN',
    greeting: 'உதயாவிற்கு நல்வரவு. அனைவருக்கும் ஒரு பிரகாசமான விடியல்.',
    script: 'Tamil',
    symbol: 'அ',
    isRTL: false,
  },
  {
    id: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    subLabel: 'ఆంధ్రప్రదేశ్ & తెలంగాణ',
    code: 'te-IN',
    greeting: 'ఉదయ యాప్‌కు స్వాగతం. ప్రతి ఒక్కరికీ ఉజ్వల భవిష్యత్తు.',
    script: 'Telugu',
    symbol: 'అ',
    isRTL: false,
  },
  {
    id: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    subLabel: 'महाराष्ट्र',
    code: 'mr-IN',
    greeting: 'उदय मध्ये आपले स्वागत आहे. सर्वांसाठी एक उज्ज्वल भविष्य.',
    script: 'Devanagari',
    symbol: 'म',
    isRTL: false,
  },
  {
    id: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    subLabel: 'ગુજરાત',
    code: 'gu-IN',
    greeting: 'ઉદયમાં આપનું સ્વાગત છે. દરેક વ્યક્તિ માટે એક ઉજ્જવળ આવતીકાલ.',
    script: 'Gujarati',
    symbol: 'અ',
    isRTL: false,
  },
  {
    id: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    subLabel: 'ಕರ್ನಾಟಕ',
    code: 'kn-IN',
    greeting: 'ಉದಯಕ್ಕೆ ಸ್ವಾಗತ. ಎಲ್ಲರಿಗೂ ಉಜ್ವಲ ಭವಿಷ್ಯ.',
    script: 'Kannada',
    symbol: 'ಅ',
    isRTL: false,
  },
  {
    id: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    subLabel: 'കേരളം',
    code: 'ml-IN',
    greeting: 'ഉദയയിലേക്ക് സ്വാഗതം. ഏവർക്കും ഒരു ശോഭനമായ നാളെ.',
    script: 'Malayalam',
    symbol: 'അ',
    isRTL: false,
  },
  {
    id: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    subLabel: 'ਪੰਜਾਬ',
    code: 'pa-IN',
    greeting: 'ਉਦੈ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਸਾਰਿਆਂ ਲਈ ਇੱਕ ਸੁਨਹਿਰਾ ਭਵਿੱਖ।',
    script: 'Gurmukhi',
    symbol: 'ੳ',
    isRTL: false,
  },
  {
    id: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    subLabel: 'شمالی و دکنی ہند',
    code: 'ur-IN',
    greeting: 'ادے میں خوش آمدید۔ ہر ایک کے لیے ایک روشن کل۔',
    script: 'Nastaliq',
    symbol: 'ع',
    isRTL: true,
  },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];
