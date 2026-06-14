# Base Konesans - Nouvo Opsyon HandyPay 1.0.18

Dat: 14 jen 2026
Version mobil: `1.0.18+65`
Android package: `com.user.handypay`

## 1. Rezime Mizajou A

Version sa a ajoute nouvo zouti pou kominikasyon, pwomosyon, asistans kliyan, konpetisyon World Cup, sèvis 1xBet, kominote ak rekonpans. Li amelyore tou estabilite koneksyon, pwofil kliyan, sekirite, ak kapasite HandyPay pou kontwole app la a distans.

Nouvo eleman prensipal yo:

- Kéthura AI amelyore ak sipò FR/EN/HT.
- World Cup 2026: match, prediksyon, klasman, rekonpans ak referral.
- Remote Config pou kontwole fonksyon app la san nouvo APK.
- Dual Base URL pou prepare tranzisyon beta pou production.
- Launch Promo Banner lè kliyan ouvri app la.
- Recharge 1xBet ak validation admin ak rezèvasyon balans.
- Lyen afilye ak kòd promo 1xBet.
- Community Links ak Points/Rewards.
- Paj Forgot Password ak Security natif nan app la.
- Koreksyon token, transactions ak enfòmasyon pwofil.
- Preparasyon Android ak iOS pou menm version `1.0.18+65`.

## 2. Kéthura AI

### Sa kliyan an wè

Kéthura parèt kòm yon sèl bouton/asistan flotan nan app la. Lè kliyan an klike:

- Yon ekran asistans fullscreen ouvri.
- Header la montre avatar Kéthura, non li ak estati Online.
- Chat la itilize espas ekran an byen.
- Zòn ekriti a rete anba ekran an.
- Kliyan an ka itilize repons rapid.
- Gen yon opsyon pou pale ak yon ajan.

### Lang

Kéthura swiv lang kliyan chwazi nan app la:

- Français
- English
- Kreyòl Ayisyen

Welcome message, bouton, repons rapid, mesaj loading, erè ak placeholder yo lokalize. Fallback la se English si lang lan pa rekonèt.

### Estabilite WebView

Nouvo lojik la:

- Evite ansyen loop JavaScript ki te ka fè Android WebView crash.
- Gen timeout si widget la pa chaje.
- Pa kite kliyan an bloke sou loading san fen.
- Montre `Retry` si gen pwoblèm.
- Ofri `Open in Browser` si WebView pa mache.
- Kache launcher entèn widget la pou pa gen de avatar.

### Kontwòl admin

Kéthura ka aktive oswa dezaktive a distans atravè Remote Config. Lè li OFF, bouton ak aksè Kéthura yo pa dwe parèt oswa ouvri.

## 3. World Cup 2026

### Fonksyon kliyan

Seksyon World Cup la genyen:

- World Cup Home.
- Lis match.
- Match k ap vini.
- Match fini ak score final.
- Prediksyon anvan match.
- Leaderboard.
- Pwen ak ran kliyan.
- Rekonpans.
- Tikè oswa eligibility.
- Referral World Cup.

### Règ prediksyon

- Prediksyon fèt sèlman anvan match kòmanse.
- Match fini pa aksepte nouvo prediksyon.
- Match ki deja pase pa aksepte prediksyon.
- Lè match fini, score final la parèt.
- Match yo estoke an UTC epi app la adapte lè a pou timezone kliyan an.
- Filtè Today pa dwe montre match yè.

### Schedule

Backend la gen sipò pou schedule ofisyèl 104 match yo, ansanm ak knockout match ki ka gen ekip TBD jiskaske ekip yo kalifye.

### Kontwòl admin

Admin ka:

- Aktive/dezaktive campaign World Cup.
- Kreye oswa modifye match.
- Mete score final.
- Jere rewards.
- Kontwole mesaj ak règ campaign lan.
- Kenbe World Cup push notifications OFF jiskaske yo valide.

## 4. Remote Config

Remote Config pèmèt HandyPay chanje plizyè eleman san rebati oswa soumèt yon nouvo APK.

App la ka resevwa:

- `world_cup_enabled`
- `kethura_enabled`
- `push_world_cup_enabled`
- `social_mode`
- `api_base_url`
- `api_base_url_fallback`
- `domain_switch_enabled`
- `force_domain_switch`
- App banner
- World Cup rules
- Reward text
- Referral text
- CTA
- Support links
- Maintenance mode/message
- Minimum app version
- Force update
- Optional update message
- Store links

### Cache ak fallback

- Config la cache lokalman pandan anviwon 15 minit.
- Si API a pa disponib, app la itilize dènye config li te sove.
- Si pa gen config lokal, li itilize default beta ki entegre nan app la.
- App la pa dwe bloke sèlman paske endpoint config la pa reponn.

### Maintenance ak update

Admin ka:

- Mete app la an maintenance.
- Montre yon mesaj maintenance.
- Mande yon update rekòmande.
- Fòse yon update si version kliyan an twò ansyen.

## 5. Dual Base URL

App la prepare pou travay ak:

- Beta: `https://beta.handypayhaiti.com/api/v1`
- Production: `https://handypayhaiti.com/api/v1`

### Konpòtman

- URL aktif la soti nan Remote Config.
- Fallback la ka chanje a distans.
- HTTP 401 ak 403 pa lakòz app la chanje domain.
- Se sèlman erè koneksyon oswa erè server ki elijib pou fallback.
- Domain switch kapab rete OFF jiskaske production pare.

### Eta aktyèl

- Primary API: beta.
- Fallback API: beta.
- Domain switch: OFF.
- Force domain switch: OFF.

## 6. Launch Promo Banner

Launch Banner se yon ti popup promo ki parèt apre kliyan ouvri app la oswa apre login.

### Kontni

- Tit.
- Mesaj.
- Imaj optional.
- Bouton Fermer/Close/Fèmen.

Li pa bezwen CTA, Tap Action oswa URL. Li pa redirije kliyan otomatikman.

### Règ

- Ka vize tout lang oswa FR/EN/HT.
- Ka mande kliyan konekte.
- Ka parèt yon sèl fwa.
- Ka parèt yon fwa pa jou.
- Ka parèt chak fwa app la ouvri.
- Ka gen start date ak end date.
- Ka dismissible oswa non.

### Imaj

- Fòma rekòmande pou Launch: `1080x1080`, rapò 1:1.
- JPG, PNG oswa WebP.
- Maksimòm 1.5 MB.
- Ansyen imaj horizontal yo toujou sipòte.

Dashboard banners toujou itilize rekòmandasyon `1200x400`.

## 7. Recharge 1xBet

### Fòm kliyan

Kliyan an antre:

- ID kont 1xBet.
- Montan recharge.
- Peyi.
- Nòt optional.

Kliyan an dwe konekte epi gen ase balans HandyPay.

### Rezèvasyon balans

Lè kliyan an soumèt demand lan:

1. Backend verifye sèvis la aktif.
2. Li verifye minimum, maximum ak frais.
3. Li verifye balans kliyan an.
4. Li rezève montan an nan yon transaction atomik.
5. Li kreye yon request pending.
6. Li kreye yon ledger transaction pending.

### Approval

Lè admin apwouve:

- Montan rezève a vin debit final.
- Request la vin completed/approved.
- Transaction pending lan vin success.
- Sistèm nan pa debit kliyan an yon dezyèm fwa.

### Rejection

Lè admin rejte:

- Montan rezève a retounen disponib.
- Request la vin rejected.
- Transaction la vin cancelled/failed.
- Yon refund ledger anrejistre si lojik la mande sa.

### Sekirite

- Double soumission limite ak idempotency.
- Double approval oswa double rejection bloke.
- Kliyan pa ka modifye yon request pending.
- Balans pa ka vin negatif.
- Approval admin obligatwa.
- Klike sou lyen afilye pa kreye transaction.

### Eta aktyèl

Sèvis Recharge 1xBet la prezan nan kòd la men li rete `OFF` pa default.

## 8. Lyen Afilye 1xBet

Si admin aktive seksyon afilye a, kliyan ki poko gen kont 1xBet ka wè:

- Yon mesaj patnè lokalize.
- Bouton `Créer un compte 1xBet`.
- Kòd promo.

Bouton an ouvri lyen an nan browser ekstèn.

### Kontwòl admin

- Aktive/dezaktive affiliate section.
- Chanje URL.
- Chanje kòd promo.
- Chanje tèks FR/EN/HT.

Backend ak app la sèlman aksepte URL HTTPS ki valab. URL `javascript:` oswa URL san host pa aksepte.

## 9. Kéthura/WhatsApp pou Demand 1xBet

Sistèm nan ka:

- Kreye event entèn lè gen nouvo demand.
- Siyen event lan ak HMAC.
- Mete timestamp anti-replay.
- Queue notification.
- Kenbe status queued, sent oswa failed.
- Retry notification ki echwe.
- Evite duplicate notification.

WhatsApp la sèvi sèlman pou notifye admin. Li pa ka apwouve oswa rejte request la otomatikman.

Admin toujou dwe antre nan panel HandyPay pou pran desizyon an.

Status delivery pa dwe montre `sent` si provider la sèlman mete mesaj la nan queue oswa si provider la pa configure.

## 10. Community & Rewards

### Paj kliyan

App la genyen yon paj:

`Kominote & Touche Pwen`

Kliyan ka wè:

- Balans pwen disponib.
- Pwen an atant.
- Lis travay aktif.
- Community links aktif.
- Opsyon conversion si admin aktive li.

Quick Action Transactions te retire sou Home pou evite doublon ak Recent Transactions. Yo ajoute aksè `Touche Pwen`.

### Community Links

Admin ka jere:

- WhatsApp Channel.
- Facebook.
- Instagram.
- X.
- Telegram.
- Website.
- Promo links.

Chak link ka gen:

- Tit ak deskripsyon.
- Kalite.
- URL.
- Placement.
- Lang.
- Peyi.
- Priyorite.
- Active/Inactive.

### Point Tasks

Admin ka kreye travay tankou:

- Join WhatsApp Channel.
- Follow Facebook/X.
- Share HandyPay.
- Invite a friend.
- Complete KYC.
- First deposit.
- Activate card.
- World Cup prediction.

Chak task ka gen:

- Kantite pwen.
- Approval obligatwa oswa otomatik.
- Repeatable oswa yon sèl fwa.
- Cooldown.
- Maximum completion pa kliyan.
- Start/end date.
- Lang ak peyi.

### Conversion pwen

Admin ka kontwole:

- Points enabled.
- Conversion enabled.
- Conversion rate.
- Minimum pwen.
- Maximum bonus pa mwa.
- KYC requirement.
- Approval admin obligatwa.

### Eta aktyèl

- Points system: OFF.
- Points conversion: OFF.
- Active point tasks: 0.

Admin dwe ranplase sample links yo epi aktive sèlman task ki pare.

## 11. Forgot Password Natif

Bouton `Forgot password?` sou login lan pa bezwen voye kliyan an sou sit la ankò.

Flow natif la:

- Kliyan antre email li.
- App la rele API reset password la.
- Kliyan resevwa etap reset ki configure sou backend la.
- Mesaj siksè oswa erè parèt nan app la.

## 12. Security Settings Natif

App la gen yon paj Security ki prepare pou fonksyon ki sou sit la, tankou:

- Chanjman modpas.
- Two-factor authentication lè backend/API disponib.
- Mesaj klè si yon opsyon pa disponib.

UI a pa dwe prezante yon bouton aktif si backend la pa bay endpoint oswa config ki nesesè.

## 13. Koreksyon Login, Token ak Pwofil

### Transactions `Unauthenticated`

Koreksyon an asire:

- Token fallback ki pi resan an pa ranplase ak yon ansyen secure token.
- Authorization Bearer header antre nan requests ki pwoteje.
- Logout efase token nan toude storage yo.
- 401/403 pa deklanche domain fallback.

### Pwofil vid

Paj Profile la:

- Rele endpoint canonical `/profile`.
- Sipòte response `data` ak ansyen envelope `user`.
- Refresh enfòmasyon apre ekran an ouvri.
- Ranpli first name, last name, phone, address, city, country ak ZIP.

## 14. Social Login

Release la konsève:

- Email/password.
- Google.
- Sign in with Apple.

Facebook ak GitHub social login pa fè pati nouvo eksperyans login lan.

Google ak Apple bouton yo disponib sou login/register selon platform ak config.

## 15. Android ak iOS

### Android

- Version name: `1.0.18`
- Version code: `65`
- Minimum SDK: 24
- Target SDK: 36

### iOS

- Version: `1.0.18`
- Build: `65`
- Minimum iOS target: 15.0
- Bundle ID: `com.user.handypay`
- Firebase plist prezan.
- Apple entitlements prezan.
- Runner itilize `FLUTTER_BUILD_NAME` ak `FLUTTER_BUILD_NUMBER`.

## 16. Kontwòl Sekirite Aktyèl

Pou release la:

- Production pa t modifye.
- Primary API rete beta.
- Fallback rete beta.
- Domain switch OFF.
- 1xBet OFF.
- Points OFF.
- Points conversion OFF.
- World Cup push OFF.
- Social mode `draft_only`.
- Pa gen autopost sosyal.
- Pa gen customer WhatsApp notification otomatik ki dwe voye san provider ak template valide.

## 17. Kesyon Kliyan Souvan

### Poukisa mwen pa wè World Cup?

World Cup ka dezaktive a distans. Verifye Remote Config ak campaign status.

### Poukisa mwen pa wè Kéthura?

Kéthura ka OFF nan Remote Config oswa config lan poko refresh. Relouvri app la oswa refresh Home.

### Poukisa 1xBet unavailable?

Sèvis la rete OFF pa default. Admin dwe aktive li apre validation operasyonèl.

### Poukisa pa gen task pwen?

Points system ak task yo rete OFF jiskaske admin configure bon links, règ ak rewards.

### Poukisa banner lan pa parèt?

Verifye:

- Status active.
- Start/end date.
- Lang.
- Login requirement.
- Show frequency.
- Kliyan an pa deja wè banner once/once-per-day.

### Kéthura rete sou loading?

App la dwe montre Retry ak Open in Browser apre timeout. Verifye koneksyon internet ak Android System WebView/Chrome.

### Transactions montre Unauthenticated?

Kliyan an dwe logout/login ankò si token li fin invalid. HTTP 401 pa dwe chanje domain.

## 18. Rekòmandasyon Operasyonèl

Anvan aktive nouvo sèvis yo:

1. Configure Community Links reyèl yo.
2. Kreye Point Tasks ak valè pwen ki soutenab.
3. Kenbe conversion OFF jiskaske limit finansye yo valide.
4. Teste Recharge 1xBet ak yon ti montan sou beta.
5. Verifye WhatsApp provider ak templates Meta.
6. Kenbe admin approval obligatwa.
7. Teste World Cup score/prediction sou beta.
8. Kenbe World Cup push OFF jiskaske mesaj yo valide.
9. Pa switch API sou production anvan production endpoint yo pare.
10. Teste iOS build nan Codemagic/App Store Connect ak version `1.0.18 (65)`.

## 19. Verifikasyon Teknik Release

- Flutter tests: 69 pase.
- Backend tests: 44 pase, 134 assertions.
- Flutter analyze: pa gen compile error.
- AAB ak release APK konstwi avèk siksè.
- Flutter GitHub `main`: `0cd4736d2e38f585321edd7199b654cb8d580e43`
- Backend GitHub `main`: `af5b91d1790d173d447e00c9961a1347578b0b50`
