### MVP Requirements

1. Uses React
2. Used SQLite as a data store
3. SQLite must be able to support migrations (via drizzle or something else)
4. RBAC system for users with 3 roles, Admin (global admin), Moderator (limited
   admin functionality), and User.
5. ALL Users (admin, moderator, users) can logon with a username and a 8 digit
   password
6. Users must verfy their email using resend.com before logging in
7. Users can change their password
8. Admin and Moderator users can send invite tokens to users using resend.com