PIXEL BEACON - booth app
========================

Visitors draw pixel art, see it encoded into 1s and 0s like the 1974
Arecibo message, then scan a QR code to download their poster (PNG) and
its alien radio signal (WAV) to their phone. No internet needed.


START
-----
1. Double-click PixelBeacon.exe.
   - Windows may say "Windows protected your PC". Click "More info",
     then "Run anyway". (The app isn't signed by a company; that's all
     this warning means.)
   - Windows Firewall will ask about network access. Tick "Private
     networks" and click "Allow". Without this, phones can't connect.
2. A black window opens and the booth screen opens in your browser.
   Keep the black window open during the event. Close it to stop.
3. Press F11 in the browser for full screen.


PHONES MUST BE ON THE SAME WI-FI AS THE LAPTOP
----------------------------------------------
The QR code points to this laptop (for example http://192.168.1.20:8080).
A phone can only open it on the same Wi-Fi.

- The address phones use is shown at the top right ("Phones: ...").
  Click it to pick a different one if the laptop has several networks.
- Event or school Wi-Fi often blocks devices from talking to each other.
  If phones can't open the code, use the laptop's own hotspot:
  Windows Settings > Network & internet > Mobile hotspot > On.
  Then click "Phones:" in the app, choose the hotspot address
  (usually 192.168.137.1), and type the hotspot's name and password.
  The app will show a "Join Wi-Fi" QR code next to every poster code,
  so visitors can join with one scan.
- Test before the event: make one poster and scan it with your phone.


WHERE THE POSTERS GO
--------------------
Every poster is saved in the "PixelBeacon-posters" folder next to
PixelBeacon.exe: a .png picture, a .wav sound and a .json record.
Phones download from there, so keep the folder while visitors might
still open their codes.


ON THE PHONE
------------
- "Download picture" saves the PNG. On iPhone you can also press and
  hold the poster and choose "Add to Photos".
- "Download sound" saves the WAV. On iPhone it goes to the Files app.


Fonts: Silkscreen, Atkinson Hyperlegible and IBM Plex Mono (SIL Open Font
License). QR codes: qrcode-generator by Kazuhiko Arase (MIT License).
