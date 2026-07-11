import avatarT0 from '@/assets/images/avatars/t0.png';
import avatarT1 from '@/assets/images/avatars/t1.png';
import avatarT2 from '@/assets/images/avatars/t2.png';
import avatarT3 from '@/assets/images/avatars/t3.png';
import avatarT4 from '@/assets/images/avatars/t4.png';
import avatarT5 from '@/assets/images/avatars/t5.png';
import avatarT6 from '@/assets/images/avatars/t6.png';
import avatarT7 from '@/assets/images/avatars/t7.png';
import avatarT8 from '@/assets/images/avatars/t8.png';
import avatarT9 from '@/assets/images/avatars/t9.png';
import faqA from '@/assets/images/icons/faq-a.svg';
import faqAq from '@/assets/images/icons/faq-aq.svg';
import faqQ from '@/assets/images/icons/faq-q.svg';
import membershipBz from '@/assets/images/membership/bz_t.png';
import membershipFree from '@/assets/images/membership/mf_t.png';
import membershipTrial from '@/assets/images/membership/sy_t.png';
import membershipProfessional from '@/assets/images/membership/zy_t.png';
import platform1688 from '@/assets/images/platform/1688.png';
import platformSms from '@/assets/images/platform/dx.png';
import platformTranslation from '@/assets/images/platform/fy.png';
import platformOzon from '@/assets/images/platform/ozon.png';
import platformVip from '@/assets/images/platform/VIP1.png';
import platformWechat from '@/assets/images/platform/wx.png';
import platformWechatPay from '@/assets/images/platform/wxzf.png';

export const systemAvatarUrls = [
  avatarT0,
  avatarT1,
  avatarT2,
  avatarT3,
  avatarT4,
  avatarT5,
  avatarT6,
  avatarT7,
  avatarT8,
  avatarT9,
];

const legacySystemAvatarUrlMap = systemAvatarUrls.reduce<Record<string, string>>((map, url, index) => {
  map[`/src/assets/images/avatars/t${index}.png`] = url;
  return map;
}, {});

export const membershipIconUrls: Record<string, string> = {
  trial: membershipTrial,
  free: membershipFree,
  standard: membershipBz,
  professional: membershipProfessional,
};

export const platformIconUrls = {
  alibaba: platform1688,
  ozon: platformOzon,
  sms: platformSms,
  translation: platformTranslation,
  vip: platformVip,
  wechat: platformWechat,
  wechatPay: platformWechatPay,
};

export const faqIconUrls = {
  answer: faqA,
  header: faqAq,
  question: faqQ,
};

export const isBundledAssetUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return (
    systemAvatarUrls.includes(url) ||
    Object.values(membershipIconUrls).includes(url) ||
    Object.values(platformIconUrls).includes(url) ||
    Object.values(faqIconUrls).includes(url)
  );
};

export const resolveLegacyAssetUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return legacySystemAvatarUrlMap[url.trim()] || null;
};
