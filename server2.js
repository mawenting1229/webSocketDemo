//使用webSocket
/*ws接口定义：
 'req', user, pass  => 'reg_ret', code, msg
 'login', user, pass => 'logig_ret', code, msg
 'message' , txt  => 'message_ret', code, msg
                => 'message', name, txt
 */

const http = require('http')
const fs = require('fs')
const mysql = require('mysql')
const io = require('socket.io')

let db = mysql.createPool({host: 'localhost', user: 'root', password: '123456', database: 'ws'});

//http服务器
let httpServer = http.createServer((req, res) => {
    fs.readFile(`www/${req.url}`, (err, data) => {
        if(err) {
            res.writeHeader(404);
            res.write('not found');
        }else{
            res.write(data);
        }
        res.end();
    });
});

httpServer.listen(8080);

//websocket服务器
let wsServer = io.listen(httpServer);
let aSock = [];
wsServer.on('connection', sock => {
    aSock.push(sock);
    let current_username = '';
    let current_userID = 0;
    //注册
    sock.on('reg', (user, pass) => {
        //校验数据
        if(!/^\w{6,32}$/.test(user)) {
           sock.emit('reg_ret', 1, '用户名不符合规范');
        }else if(!/^.{6,32}$/.test(pass)) {
            sock.emit('reg_ret', 1, '密码不符合规范');
        }else{
            //检查用户名是否已存在
            db.query(`SELECT ID FROM user_table WHERE username='${user}'`, (err, data) =>{
                if(err) {
                    sock.emit('reg_ret', 1, '数据库有错');
                }else if(data.length > 0) {
                    sock.emit('reg_ret', 1, '用户名已存在');
                }else{
                    //插入数据库
                    db.query(`INSERT INTO user_table(username, password, online) VALUES ('${user}', '${pass}', 0)`, (err) => {
                        if(err) {
                            sock.emit('reg_ret', 1, '数据库有错，插入数据库失败');
                        }else{
                            sock.emit('reg_ret', 0, '注册成功');
                        }
                    })
                }
            })
        }
    });
    //登录
    sock.on('login', (user, pass) => {
        //校验数据
        if(!/^\w{6,32}$/.test(user)) {
           sock.emit('login_ret', 1, '用户名不符合规范');
        }else if(!/^.{6,32}$/.test(pass)) {
            sock.emit('login_ret', 1, '密码不符合规范');
        }else{
            //检查用户名是否存在
            db.query(`SELECT ID,password FROM user_table WHERE username='${user}'`, (err, data) =>{
                if(err) {
                    sock.emit('login_ret', 1, '数据库有错');
                }else if(data.length == 0) {
                    sock.emit('login_ret', 1, '用户名不存在');
                }else if(data[0].password != pass) {
                    sock.emit('login_ret', 1, '用户名或密码错误');
                }else{
                    //改在线状态
                    db.query(`UPDATE  user_table SET online=1 WHERE ID=${data[0].ID}`, (err) => {
                        if(err) {
                            sock.emit('login_ret', 1, '数据库有错');
                        }else{
                            sock.emit('login_ret', 0, '登录成功');
                            current_username = user;
                            current_userID = data[0].ID;
                        }
                    })
                }
            })
        }
    });
    //离线
    sock.on('disconnect', () => {
        db.query(`UPDATE user_table SET online=0 WHERE ID=${current_userID}`, err => {
            if(err) {
                console.log('数据库有错，设置离线失败');
            }
            current_username = '';
            current_userID = 0;
            aSock = aSock.filter(item => item != sock);
        })
    })
    //发言
    sock.on('message', (txt) => {
        if(!txt) {
            sock.emit('message_ret', 1, '消息不能为空');
        }else{
            //广播给所有人
            aSock.forEach(item => {
                if(item == sock) return;
                sock.emit('message2', current_username, txt);

            })
            sock.emit('message_ret', 0, '消息广播成功');
        }
    })
})

