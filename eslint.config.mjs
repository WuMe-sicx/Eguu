// eslint-config-next@16 已是 flat config 原生:直接展开其导出数组,
// 不再经 @eslint/eslintrc 的 FlatCompat(把 flat config 当 eslintrc 校验会崩:
// "Converting circular structure to JSON",此为 Next 15 模板遗留写法)。
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // 客户端组件读取仅客户端可得的状态(主题/滚动/media query)只能在挂载 effect 里 setState
      // ——SSR 无 document/window,此为 hydration 正确写法。降为 warn(与上面几条同风格)不阻断 CI。
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
