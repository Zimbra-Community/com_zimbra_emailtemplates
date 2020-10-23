Zimbra Email Templates
==========

On top of the version maintained by Zimbra, this version supports:
- Supports inline images
- Supports setting personas/from address correctly
- Supports organizing templates in sub folders

This version supports Zimbra 8.8.15. For a Zimbra 9 version go to https://github.com/Zimbra/zimbra-zimlet-email-templates

**Installing**

Download the latest `com_zimbra_emailtemplates.zip` from https://github.com/Zimbra-Community/com_zimbra_emailtemplates/releases and as zimbra user run `zmzimletctl -l deploy com_zimbra_emailtemplates.zip`

If you are upgrading from an older/different email templates: On the server you need to restart mailboxd `zmmailboxdctl restart` for the upgrade to work. Existing users will need to set their templates folder again even if they already did in an older version as a result of https://bugzilla.zimbra.com/show_bug.cgi?id=108986

If you find Email templates useful and want to support its continued development, you can make donations via:
- PayPal: info@barrydegraaff.tk
- Bank transfer: IBAN NL55ABNA0623226413 ; BIC ABNANL2A

_This is the adopted version of Email templates -zimlet_ from Zimbra Inc.

Email templates are useful for Sales, Support or anyone who sends out the same email on a regular basis.

Set templates folder
![alt text](https://raw.githubusercontent.com/Zimbra-Community/com_zimbra_emailtemplates/master/01.png "Set templates folder")

Create a template email
![alt text](https://raw.githubusercontent.com/Zimbra-Community/com_zimbra_emailtemplates/master/02.png "Create a template email")

Save the template
![alt text](https://raw.githubusercontent.com/Zimbra-Community/com_zimbra_emailtemplates/master/03.png "Save the template")

Use the template for new mails
![alt text](https://raw.githubusercontent.com/Zimbra-Community/com_zimbra_emailtemplates/master/04.png "Use the template for new mails")

Organize your templates by putting them in sub-folders (new)
![alt text](https://raw.githubusercontent.com/Zimbra-Community/com_zimbra_emailtemplates/master/06.png "Organize with sub folders")

Designed for Zimbra 8.7 and above, Zimbra desktop is not supported.

Or if you prefer video: https://youtu.be/o877BaQRiUY
