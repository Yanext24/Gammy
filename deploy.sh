#!/bin/bash

# =========================================
# Gammy Blog - Deploy Script
# Сервер: 176.114.13.4
# =========================================

echo "🚀 Начинаем деплой Gammy Blog..."

# 1. Остановить и удалить старые сервисы
echo "📦 Останавливаем старые сервисы..."
systemctl stop apache2 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true
systemctl stop mysql 2>/dev/null || true
systemctl stop mariadb 2>/dev/null || true

# 2. Удалить старый сайт WordPress
echo "🗑️ Удаляем старый сайт..."
rm -rf /var/www/html/*
rm -rf /var/www/wordpress 2>/dev/null || true

# 3. Удалить Apache (будем использовать Nginx)
echo "🔧 Удаляем Apache..."
apt purge apache2 apache2-utils -y 2>/dev/null || yum remove httpd -y 2>/dev/null || true
apt autoremove -y 2>/dev/null || true

# 4. Установить Nginx
echo "📥 Устанавливаем Nginx..."
apt update && apt install nginx -y 2>/dev/null || yum install nginx -y

# 5. Создать директорию для сайта
echo "📁 Создаём директорию..."
mkdir -p /var/www/gammy.space
chown -R www-data:www-data /var/www/gammy.space 2>/dev/null || chown -R nginx:nginx /var/www/gammy.space

# 6. Настроить Nginx
echo "⚙️ Настраиваем Nginx..."
cat > /etc/nginx/sites-available/gammy.space << 'EOF'
server {
    listen 80;
    server_name gammy.space www.gammy.space 176.114.13.4;
    root /var/www/gammy.space;
    index index.html;

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Создать симлинк (если папка sites-enabled существует)
if [ -d "/etc/nginx/sites-enabled" ]; then
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/gammy.space /etc/nginx/sites-enabled/
else
    # CentOS - другая структура
    cp /etc/nginx/sites-available/gammy.space /etc/nginx/conf.d/gammy.space.conf
fi

# 7. Проверить конфиг и запустить Nginx
echo "✅ Проверяем конфигурацию..."
nginx -t

echo "🔄 Запускаем Nginx..."
systemctl enable nginx
systemctl restart nginx

# 8. Установить Certbot для SSL
echo "🔒 Устанавливаем Certbot..."
apt install certbot python3-certbot-nginx -y 2>/dev/null || yum install certbot python3-certbot-nginx -y 2>/dev/null || true

echo ""
echo "==========================================="
echo "✅ Сервер готов!"
echo "==========================================="
echo ""
echo "Теперь загрузите файлы сайта командой:"
echo "scp -r /Users/anlobodzinskij/Desktop/Gammy/* root@176.114.13.4:/var/www/gammy.space/"
echo ""
echo "После загрузки установите SSL:"
echo "certbot --nginx -d gammy.space -d www.gammy.space"
echo ""
echo "⚠️  НЕ ЗАБУДЬТЕ СМЕНИТЬ ПАРОЛЬ ROOT!"
echo "passwd"
echo ""
