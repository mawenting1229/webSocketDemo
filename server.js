//不使用webSocket
const http = require('http')
const fs = require('fs')
const url = require('url')
const mysql = require('mysql')

let db = mysql.createPool({host: 'localhost', user: 'root', password: '123456', database: 'ws'});

//http服务器
let httpServer = http.createServer((req, res) => {

    let { pathname, query } = url.parse(req.url, true)

    if(pathname == '/reg') {
        //注册接口
        let { user, pass } = query;
        //校验数据
        if(!/^\w{6,32}$/.test(user)) {
            res.write(JSON.stringify({code: 1, msg: '用户名格式不正确'}));
            res.end();
        }else if(!/^.{6,32}$/.test(pass)) {
            res.write(JSON.stringify({code: 1, msg: '密码格式不正确'}));
            res.end();
        }else{
            //检查用户名是否重复
            db.query('SELECT ID FROM user_table WHERE username="'+user+'"', (err, data) => {
                if(err) {
                    res.write(JSON.stringify({code: 1, msg: '数据库有错'}));
                    res.end();
                }else if(data.length > 0){
                    res.write(JSON.stringify({code: 1, msg: '用户名已存在'}));
                    res.end();
                }else{
                    //插入
                    db.query('INSERT INTO user_table(username, password, online) VALUES ("'+user+'","'+pass+'",'+'0)', (err, data) => {
                        if(err) {
                            res.write(JSON.stringify({code: 1, msg: '数据库有错'}));
                            res.end();
                        }else{
                            res.write(JSON.stringify({code: 0, msg: '注册成功'}));
                            res.end();
                        }
                    })
                }
            })
        }

    }else if(pathname == '/login') {
        //登录接口
        let { user, pass } = query;
        //校验数据
        if(!/^\w{6,32}$/.test(user)) {
            res.write(JSON.stringify({code: 1, msg: '用户名格式不正确'}));
            res.end();
        }else if(!/^.{6,32}$/.test(pass)) {
            res.write(JSON.stringify({code: 1, msg: '密码格式不正确'}));
            res.end();
        }else{
            //取数据 检查用户名是否存在
            db.query('SELECT ID,password FROM user_table WHERE username="'+user+'"', (err, data) => {
                if(err) {
                    res.write(JSON.stringify({code: 1, msg: '数据库有错'}));
                    res.end();
                }else if(data.length == 0){
                    res.write(JSON.stringify({code: 1, msg: '用户名不存在'}));
                    res.end();
                }else if(data[0].password != pass){
                   res.write(JSON.stringify({code: 1, msg: '用户名或密码错误'}));
                   res.end();
                }else{
                    //设置状态
                    db.query(`UPDATE  user_table SET online=1 WHERE ID=${data[0].ID}`, (err) => {
                        if(err) {
                            res.write(JSON.stringify({code: 1, msg: '数据库有错'}));
                            res.end();
                        }else{
                            res.write(JSON.stringify({code: 0, msg: '登录成功'}));
                            res.end();
                        }
                    })
                }
            })
        }
    }else{
        fs.readFile(`www/${pathname}`, (err, data)=> {
            if(err){
                res.writeHeader(404);
                res.write('Not Found')
            }else{
                res.write(data);
            }
            res.end();
        });
    }
});

httpServer.listen(8080);