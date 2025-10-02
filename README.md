<h1 align="center">ytdl-bot</h1>
<p align="center">Telegram-бот для скачивания с YouTube</p>

<div align="center">
<img src="https://img.shields.io/badge/MIT-green?style=for-the-badge"/>
<img src="https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E"/>
<img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge"/>
</div>

## Особенности
- <b>Запуск VPN (linux)</b>
<br/>Если установлен конфиг WireGuard, можно автоматически включать/выключать VPN на отдельном ```network``` (скрипт ```utils/youtube.js```). IP серверов YouTube парсятся автоматически (можно доработать)
> ⚠️ Обязательно в конфиге указать значение Table = True!
- <b>Скачивание в Yandex Drive</b>
<br/>Видео сразу загружается на яндекс диск в указанную папку, не скачиваясь на устройство

## В планах
- Изменить настройку ```network``` на установку ```AllowedIPs``` в копированный конфиг
- Добавить поддержку Google Drive / кастомных удаленных серверов
- Дописать ReadMe
