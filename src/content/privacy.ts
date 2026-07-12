import type { Locale } from '@/i18n/config'

// 隐私政策静态内容(PIPL 上线门禁,§16)。⚠️ 占位法务文案,上线前须法务复核并替换。
// 非 CMS 管理:当前无对应字段;二期若需编辑可维护再升级为 global。

export type PrivacySection = { heading: string; body: string[] }
export type PrivacyContent = { updated: string; notice: string; sections: PrivacySection[] }

const zh: PrivacyContent = {
  updated: '最后更新:占位日期',
  notice: '本页为占位文本,正式上线前须经法务复核并替换为符合《个人信息保护法》的正式条款。',
  sections: [
    {
      heading: '一、我们收集的个人信息',
      body: ['当您通过项目咨询表单联系我们时,我们收集您主动填写的姓名、手机号码、电子邮箱及留言内容。'],
    },
    {
      heading: '二、使用目的与方式',
      body: [
        '上述信息仅用于回应您的咨询、与您沟通合作事宜。',
        '我们不会将您的个人信息用于与咨询无关的目的,不进行自动化决策。',
      ],
    },
    {
      heading: '三、留存期限',
      body: ['咨询信息自收集之日起留存 12 个月,到期后我们将删除或匿名化处理,并同步清理相关通知记录与含个人数据的日志。'],
    },
    {
      heading: '四、受托处理方',
      body: ['为发送通知,我们可能将必要信息提供给邮件与短信服务商。我们与其约定仅按本政策目的处理,不得另作他用。'],
    },
    {
      heading: '五、您的权利',
      body: [
        '您有权查询、更正、删除您的个人信息,或撤回已作出的同意。',
        '如需行使上述权利,请通过页脚或联系页公布的邮箱与我们联系,我们将在合理期限内响应。',
      ],
    },
    {
      heading: '六、联系我们',
      body: ['个人信息保护相关事宜,请通过联系页公布的方式与我们的负责人联系。'],
    },
  ],
}

const en: PrivacyContent = {
  updated: 'Last updated: placeholder date',
  notice: 'This page is placeholder text and must be reviewed and replaced by legal counsel before launch.',
  sections: [
    {
      heading: '1. Information We Collect',
      body: ['When you contact us through the project enquiry form, we collect the name, phone number, email and message you choose to provide.'],
    },
    {
      heading: '2. Purpose and Use',
      body: [
        'This information is used only to respond to your enquiry and to communicate about potential collaboration.',
        'We do not use your personal information for unrelated purposes, nor for automated decision-making.',
      ],
    },
    {
      heading: '3. Retention',
      body: ['Enquiry data is retained for 12 months from collection, after which it is deleted or anonymised, together with related notification records and logs containing personal data.'],
    },
    {
      heading: '4. Processors',
      body: ['To send notifications we may share necessary information with email and SMS providers, who are bound to process it solely for the purposes of this policy.'],
    },
    {
      heading: '5. Your Rights',
      body: [
        'You may access, correct or delete your personal information, or withdraw consent you have given.',
        'To exercise these rights, contact us at the email published in the footer or on the contact page; we will respond within a reasonable period.',
      ],
    },
    {
      heading: '6. Contact Us',
      body: ['For matters relating to personal information protection, please reach our responsible person via the channels on the contact page.'],
    },
  ],
}

export const getPrivacy = (locale: Locale): PrivacyContent => (locale === 'en' ? en : zh)
