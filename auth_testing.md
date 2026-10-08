# Auth Testing Playbook (Parent Link — The Village)

The app supports BOTH JWT email/password auth and Emergent Google auth.

## JWT
- POST /api/auth/register {name,email,password(min 8),role: parent|volunteer|both, neighborhood}
- POST /api/auth/login {email,password} -> sets httpOnly cookies access_token (15m) + refresh_token (7d)
- GET /api/auth/me, POST /api/auth/refresh, POST /api/auth/logout
- Brute force: 5 failed attempts per ip:email -> 15 min lockout (429)
- Bearer header with access token also works: Authorization: Bearer <access_token>

```
curl -c cookies.txt -X POST $URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"passienc@gmail.com","password":"VillageAdmin2026!"}'
curl -b cookies.txt $URL/api/auth/me
```

## Google (Emergent)
- Users have custom `user_id` (string). Sessions in `user_sessions` {user_id, session_token, expires_at ISO}.
- POST /api/auth/google/session {session_id} -> sets session_token cookie.
- New Google users have role=null and are sent to /onboarding to choose a role.

To simulate a Google session:
```
mongosh --eval "
use('test_database');
var uid='user_test'+Date.now(); var tok='test_session_'+Date.now();
db.users.insertOne({user_id:uid,email:'test.user.'+Date.now()+'@example.com',name:'Test User',role:'parent',neighborhood:'Klamath Falls',bio:'',email_notifications:false,suspended:false,created_at:new Date().toISOString()});
db.user_sessions.insertOne({user_id:uid,session_token:tok,expires_at:new Date(Date.now()+7*864e5).toISOString(),created_at:new Date().toISOString()});
print(tok);"
```
Then use cookie `session_token=<tok>` or header `Authorization: Bearer <tok>`.
