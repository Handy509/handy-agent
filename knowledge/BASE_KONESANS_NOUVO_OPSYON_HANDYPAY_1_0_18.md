# Baz konesans HandyPay — 28 jiyè 2026

Dokiman sa a ranplase ansyen enfòmasyon sou pwodwi yo. Lè yon memwa oswa ansyen repons kontredi dokiman sa a, sèvi ak dokiman sa a.

## HandyPay Digital sou Windows

- Non Microsoft Store la se **HandyPay Digital**; mak pwodwi a rete **HandyPay**.
- Vèsyon Windows `1.0.31.0` te soumèt bay Microsoft nan dat 28 jiyè 2026.
- Li anba sètifikasyon Microsoft. Pa di kliyan li deja disponib pou telechaje jiskaske Microsoft pibliye li.
- Lè li pibliye, li pral bay eksperyans HandyPay la sou PC ak yon koòdone adapte pou gwo ekran.
- Fonksyon prensipal yo gen ladan kont, balans, tranzaksyon, kat, alimentation, transfè, rechaj mobil, retrè ak Kéthura AI.

Repons rekòmande:
> Vèsyon HandyPay Digital pou Windows la deja soumèt bay Microsoft epi li anba sètifikasyon. N ap anonse lyen ofisyèl Microsoft Store la lè li pibliye.

## Fonksyon ki retire

- World Cup/Mondyal la fini epi seksyon an retire sou sit ak app la.
- `app-remote-config` se yon ansyen paj admin ki retire.
- `openclaw` retire paske li pa t itil oswa fonksyonèl.
- Pa pwopoze, pa anonse, epi pa dirije kliyan sou okenn nan fonksyon sa yo.

## New USD Visa

- Paj kliyan an se `https://handypayhaiti.com/user/new-visa-cards`.
- Paj admin pou demann rechaj yo se `/Handy13/card-services/new-usd-visa/recharge-requests`.
- Lè yon kliyan soumèt yon demann rechaj New Visa, Kéthura dwe notifye admin sou WhatsApp atravè event entèn `new_visa_recharge_requested`.
- Notifikasyon an pa apwouve ni rejte demann lan; admin dwe pran desizyon an nan panel la.

### Montan ak denominasyon

- Dapre repons ofisyèl BSICards la, se endpoint `getcard` la ki bay detay balans.
- Sou `getcard`, `details.balance` ak `transactions[].amount` deja an **USD (major units)**.
- Egzanp: `balance: 10` vle di **$10.00 USD**; `amount: 5` vle di **$5.00 USD**.
- Pa divize oswa miltipliye yon montan selon gwosè li.
- Pou valè tankou `490000`, `2000000`, oswa `31000000`, sou `getcard` valè a rete menm kantite USD endpoint la voye a. Pa sipoze se sant oswa mikwo-inite.
- Pou authorization, declined authorization, settlement, refund, termination balance oswa fees ki soti nan lòt endpoint/webhook, kontra a poko konfime. Pa fè konvèsyon; mande endpoint/event egzak la oswa eskale bay ekip teknik.
- Si API a bay `currency`, montre li. Pa envante yon `decimals`, `scale`, oswa `unit` ki pa nan payload la.

## Sipò ak sekirite

- Reponn nan lang kliyan an: Kreyòl, franse oswa angle.
- Pa mande CVV, PIN, modpas, token, kle API oswa nimewo kat konplè.
- Pou kat bloke, lajan ki pa parèt, KYC, gwo montan oswa montan ki gen echèl anbig, kreye yon ticket/escalation.
- Sit ofisyèl: `https://handypayhaiti.com`.
- Email: `support@handypayhaiti.com`.
- WhatsApp rapid: `+509 35 66 5273`.
- Admin: `+1 (913) 733-7645`.

## Analiz kalite repons

Chak nouvo repons web ak WhatsApp resevwa yon nòt kalite ak drapo pou:

- repons ki twò pòv oswa ki pa rezoud kesyon an;
- mansyon yon fonksyon ki retire;
- konvèsyon montan New Visa ki pa gen kontra;
- reklamasyon ki di app Windows la deja pibliye;
- repons ki twò long.

Kliyan web yo ka voye `helpful` oswa `not_helpful` sou response ID la. Rapò operasyon an dwe sèvi ak nòt ak feedback sa yo pou idantifye sijè ki bezwen nouvo egzanp oswa koreksyon.
