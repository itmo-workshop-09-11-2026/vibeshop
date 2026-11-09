# Деплой на сервер с nginx

Схема: push в `main` → тесты (`ci.yml`) → `rsync` папки `site/` в `/var/www/orbita/releases/<время>-<sha>/` → атомарное переключение ссылки `current` → проверка публичного `/version.txt`. Хранятся 5 последних релизов.

## Один раз на сервере (Ubuntu/Debian, нужен домен, указывающий на сервер)

```bash
sudo apt update && sudo apt install -y nginx certbot rsync
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/orbita/releases /var/www/certbot
sudo chown -R deploy:deploy /var/www/orbita
sudo -u deploy mkdir -p /home/deploy/.ssh && sudo -u deploy chmod 700 /home/deploy/.ssh
# вставьте публичный ключ деплоя (см. ниже):
echo "ssh-ed25519 AAAA... orbita-deploy" | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys

# заглушка, чтобы nginx стартовал до первой выкладки
sudo -u deploy mkdir -p /var/www/orbita/releases/init && echo ok | sudo -u deploy tee /var/www/orbita/releases/init/index.html
sudo -u deploy ln -sfn releases/init /var/www/orbita/current
```

**Сертификат** (замените `DOMAIN`):
```bash
sudo tee /etc/nginx/conf.d/orbita-bootstrap.conf >/dev/null <<'CONF'
server { listen 80; server_name DOMAIN; location /.well-known/acme-challenge/ { root /var/www/certbot; } }
CONF
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d DOMAIN
sudo rm /etc/nginx/conf.d/orbita-bootstrap.conf
```

**Конфиг сайта** (файлы из репозитория, папка `deploy/nginx/`):
```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp deploy/nginx/orbita-site.conf /etc/nginx/snippets/orbita-site.conf
sed 's/__DOMAIN__/DOMAIN/g' deploy/nginx/orbita.conf | sudo tee /etc/nginx/sites-available/orbita >/dev/null
sudo ln -sf /etc/nginx/sites-available/orbita /etc/nginx/sites-enabled/orbita
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
Продление сертификата выполняет таймер certbot; проверка: `sudo certbot renew --dry-run`.

## Ключ деплоя (на своём компьютере)
```bash
ssh-keygen -t ed25519 -f orbita_deploy -N "" -C orbita-deploy
```
Отпечаток сервера workflow получает сам (`ssh-keyscan`), отдельный секрет не нужен.

`orbita_deploy.pub` — на сервер (`authorized_keys`), содержимое `orbita_deploy` — в секрет `DEPLOY_SSH_KEY`. После настройки удалите оба файла с компьютера.

## Откат
```bash
ssh deploy@SERVER 'cd /var/www/orbita && ls -1t releases'          # выберите релиз
ssh deploy@SERVER 'cd /var/www/orbita && ln -sfn releases/<РЕЛИЗ> current.new && mv -Tf current.new current'
```
