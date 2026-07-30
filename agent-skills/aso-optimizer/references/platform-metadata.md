# 平台元数据参考

核对日期：2026-07-30。正式发布前如规则可能变化，应重新检查官方文档。

## Apple App Store

| 字段 | 校验限制 | 备注 |
|---|---:|---|
| Name | 30 字符 | 可本地化 |
| Subtitle | 30 字符 | 可本地化 |
| Keywords | 保守按 100 UTF-8 字节 | Apple 资料也使用 100 字符的表述；按字节校验可避免多字节溢出 |
| Promotional text | 170 字符 | 不能代替关键词字段 |
| Description | 4000 字符 | 用于准确解释产品和支持转化 |

Apple 表示 App 可通过名称、副标题、关键词和公司名称被搜索。关键词字段应避免重复、无关、商标或竞品词。

官方来源：

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- https://developer.apple.com/app-store/product-page/

## Google Play

| 字段 | 限制 |
|---|---:|
| App name | 30 字符 |
| Short description | 80 字符 |
| Full description | 4000 字符 |

文案必须自然、准确。Google 禁止误导、无关、重复、促销或操纵排名的元数据。不得以第三方平台分数为由堆砌重复词。

官方来源：

- https://support.google.com/googleplay/android-developer/answer/9859152
- https://support.google.com/googleplay/android-developer/answer/13393723
- https://support.google.com/googleplay/android-developer/answer/9898842

## 本地化

字符限制按本地化版本分别计算。应针对每个市场研究搜索语言，不得把关键词列表直译后称为已验证。
