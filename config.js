// إعدادات حسابات الزوار.
// اتركها فارغة = وضع تجريبي (حسابات داخل متصفح الزائر فقط، وغير آمنة).
// للحماية الحقيقية املأ القيمتين من لوحة Supabase (Project Settings > API).
window.SITE_CONFIG = {
  supabaseUrl: "",   // مثال: https://abcdxyz.supabase.co
  anonKey: "",       // المفتاح العام anon (مصمم ليكون ظاهراً للزوار)
  bucket: "downloads" // اسم الحاوية الخاصة (Private) التي تحوي الملفات
};
