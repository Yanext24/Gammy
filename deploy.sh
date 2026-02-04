#!/bin/bash
# Gammy Blog - Deploy Script
# Usage: ./deploy.sh [command]
# Commands:
#   deploy  - Sync files to server (default)
#   ssh     - Connect to server via SSH
#   logs    - View PM2 logs
#   restart - Restart server
#   status  - Check server status

SERVER="root@176.114.13.4"
REMOTE_PATH="/root/Gammy"
LOCAL_PATH="/Users/anlobodzinskij/Desktop/Gammy"

case "${1:-deploy}" in
    ssh)
        echo "🔗 Connecting to Gammy server..."
        ssh $SERVER
        ;;

    deploy)
        echo "📦 Deploying Gammy to server..."
        rsync -avz -e ssh "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/" \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude 'data/' \
            --exclude '.DS_Store'
        echo "✅ Deploy complete!"
        ;;

    logs)
        echo "📋 PM2 logs:"
        ssh $SERVER "pm2 logs gammy --lines 50 --nostream"
        ;;

    restart)
        echo "🔄 Restarting Gammy server..."
        ssh $SERVER "pm2 restart gammy"
        echo "✅ Server restarted!"
        ;;

    status)
        echo "📊 Server status:"
        ssh $SERVER "pm2 status gammy"
        ;;

    db)
        echo "🗄️ Database info:"
        ssh $SERVER "cd $REMOTE_PATH && node -e \"const db = require('./server/db').getDb(); console.log('Users:', db.prepare('SELECT COUNT(*) as c FROM users').get().c); console.log('Posts:', db.prepare('SELECT COUNT(*) as c FROM posts').get().c);\""
        ;;

    *)
        echo "Usage: ./deploy.sh [deploy|ssh|logs|restart|status|db]"
        ;;
esac
