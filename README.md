# API of the education system of SYSU

## 中山大学教务系统API

# Install
	
	npm install sysujwxt

# Quick Start
	
	var Error = require('sysujwxt').Error;
	var JWXT = require('sysujwxt').JWXT;
	
	var jwxt = new JWXT();
	
	jwxt.getCheckCode().then(function (imageData) {
		// do something with check code image
		
		jwxt.login(username, password, checkcode).then(function () {
			// login success
			
			jwxt.getScore('2015-2016', '2').then(function (courses) {
				// do something with the scores
				
				jwxt.logout(); // log out
				
			});
			
		}).catch(function (err) {
			// login failed
			
			if (err.code == Error.wrongPassword.code) {
				// wrong password
			} else if (err.code == Error.wrongCheckCode.code) {
				// wrong check code
			}
			
		});
	});
# Usage

## sysujwxt#JWXT
用于登录教务系统，初始化一个用于登录教务系统的客户。
	
	var jwxtClient = new JWXT(); // 初始化一个默认的客户
	
	var jwxtClient = new JWXT(jsessionid, rno); // 用指定的数据初始化
	
如果使用默认信息，则需要调用`getCookie()`来获取客户登录信息。  
已经获取并登录的客户可以保存其`jsessionid`和`rno`信息并指定初始化来继续登录。(更换ip或者较长时间未操作或者该账户使用别的登录信息登录可能导致**登录信息失效**)

### JWXT#getCookie()
#### 参数
无
#### 返回值
`Promise.resolve()` 如果获取成功。  
`Promise.reject(err)` 如果获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于向服务器获取用于登录的jsessionid和rno信息。  
已有登录信息调用将会覆盖原本信息。  
### JWXT#getCheckCode()
#### 参数
无
#### 返回值
`Promise.resolve(imageData)` 如果获取成功。`imageData`为将图片使用`base64`编码后的`string`类型。  
`Promise.reject(err)` 如果获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于获取验证码。  
如果没有登录信息会自动调用`JWXT#getCookie`。  
### JWXT#login(username, password, checkcode)
#### 参数
`username` 教务系统用户名（学号）  
`password` 教务系统登录密码  
`checkcode` 验证码
#### 返回值
`Promise.resolve()` 如果登录成功。  
`Promise.reject(err)` 如果登录失败。`err`为`sysujwxt#Error`类型。  
#### 说明
使用登录信息登录到教务系统。传入的验证码参数是调用`JWXT#getCheckCode()`获取的验证码图片上的信息。
### JWXT#isLogin()
#### 参数
无
#### 返回值
`Promise.resolve()` 如果已经登录。 
`Promise.reject(err)` 如果未登录或者没有客户信息。`err`为`sysujwxt#Error`类型。  
#### 说明
用于检测现有客户信息是否处于登录状态。
### JWXT#logout()
#### 参数
无
#### 返回值
`Promise.resolve()` 退出成功。
`Promise.reject(err)` 退出失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于退出当前登录。未登录调用不会返回`Promise.reject`，但是没有登录信息等其它错误依然会返回失败。
### JWXT#getTimeTable(year, term)
#### 参数
`year` 获取的学年度，如`"2015-2016"`。  
`term` 获取的学期，如`"2"`。  
#### 返回值
`Promise.resolve(table)` 获取成功。`table`为课表信息。  
`Promise.reject(err)` 获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于获取课表。返回的课表是一个数组，数组的一个样例如下：

	[
		{
            day: 1,                  // 上课日期，0代表周一，6代表周日
            name: 'Web 2.0程序设计', // 课程名称
            place: '实验中心B202',   // 上课地点
            start: 13,              // 开始上课节数
            end: 15,                // 下课节数
            last: 3,                // 持续节数
            weeks: '(1-17周)'       // 上课周数
		},
		{
			...
		}
	]
如果参数不符合格式，则返回的是一个空数组。
### JWXT#getScore(year, term)
#### 参数
`year` 获取的学年度，如`"2015-2016"`。  
`term` 获取的学期，如`"2"`。  
#### 返回值
`Promise.resolve(courses)` 获取成功。`courses`为成绩列表。  
`Promise.reject(err)` 获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于获取成绩。返回的成绩是一个数组，数组的一个样例如下：

    [
        {
            jxbpm: '6/90',                                // 教学班排名
            bzw: '00',                                    // 
            cjzt: '2',                                    // 
            cjlcId: '9623162470',                         //
            kcywmc: 'Digital Circuit and Logic Design',   // 课程英文名称
            jxbh: '62000781152003',                       // 教学班号
            jsxm: '邓革',                                 // 教师名称
            zpcj: '92',                                   // 总评成绩
            resource_id: '9623162470',                    // 
            xnd: '2015-2016',                             // 学年度
            xq: '2',                                      // 学期
            kch: '62000781',                              // 课程号
            kcmc: '数字电路与逻辑设计',                     // 课程名称
            kclb: '11',                                   // 课程类别
            xf: '3.0',                                    // 学分
            xs: '54.0',                                   // 学时
            zzcj: '92',                                   // 最终成绩
            jd: '4.2',                                    // 绩点
            sftg: '1',                                    // 
            xh: '14331385'                                // 学号
        },
        {
            ...
        }
    ]
由于数据是直接从教务系统抓取而来，因此部分数据项作用暂时不明。  
如果参数不符合格式，则返回的是一个空数组。
### JWXT#GetElectResult(year, term)
#### 参数
`year` 获取的学年度，如`"2015-2016"`。  
`term` 获取的学期，如`"2"`。  
#### 返回值
`Promise.resolve(courses)` 获取成功。`courses`为课程列表。  
`Promise.reject(err)` 获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于获取选课结果。返回的课程是一个数组，数组的一个样例如下：
    
    [
        {
            xnd: '2015-2016',                        // 学年度
            xq: '2',                                 // 学期
            resourceID: '169759455',                 // 
            jxbh: '62000296152001',                  // 教学班号
            kcmc: '数据结构与算法',                    // 课程名称
            xm: '吴向军',                             // 教师姓名
            pylbm: '01',                             // 
            kclbm: '11',                             // 课程类别名
            kch: '62000296',                         // 课程号
            xf: '3',                                 // 学分
            kkdw: '67000',                           // 
            pkdw: '67000',                           // 
            sksjdd: '星期三 3-5 节/东C204（1-17 周）', // 上课时间地点
            jlfs: '01',                              // 
            zjjs: '004819',                          // 
            xkcgbz: '05'                             // 
        },
        {
            ...
        }
    ]
由于数据是直接从教务系统抓取而来，因此部分数据项作用暂时不明。  
如果参数不符合格式，则返回的是一个空数组。
## sysujwxt#Elect
用于登录选课系统，初始化一个用于登录选课系统的客户。
	
	var electClient = new Elect(); // 初始化一个默认的客户
	
	var electClient = new Elect(jsessionid, sid); // 用指定的数据初始化
	
如果使用默认信息，则需要调用`getCookie()`来获取客户登录信息。  
已经获取并登录的客户可以保存其`jsessionid`和`sid`信息并指定初始化来继续登录。(更换ip或者较长时间未操作或者该账户使用别的登录信息登录可能导致**登录信息失效**)
### Elect#getCookie()
#### 参数
无
#### 返回值
`Promise.resolve()` 如果获取成功。  
`Promise.reject(err)` 如果获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于向服务器获取用于登录的jsessionid和sid信息。  
已有登录信息调用将会覆盖原本信息。  
### Elect#getCheckCode()
#### 参数
无
#### 返回值
`Promise.resolve(imageData)` 如果获取成功。`imageData`为将图片使用`base64`编码后的`string`类型。  
`Promise.reject(err)` 如果获取失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于获取验证码。  
如果没有登录信息会自动调用`JWXT#getCookie`。  
### Elect#login(username, password, checkcode)
#### 参数
`username` 选课系统用户名（学号）  
`password` 选课系统登录密码  
`checkcode` 验证码
#### 返回值
`Promise.resolve()` 如果登录成功。  
`Promise.reject(err)` 如果登录失败。`err`为`sysujwxt#Error`类型。  
#### 说明
使用登录信息登录到选课系统。传入的验证码参数是调用`JWXT#getCheckCode()`获取的验证码图片上的信息。
### Elect#isLogin()
#### 参数
无
#### 返回值
`Promise.resolve()` 如果已经登录。 
`Promise.reject(err)` 如果未登录或者没有客户信息。`err`为`sysujwxt#Error`类型。  
#### 说明
用于检测现有客户信息是否处于登录状态。
### Elect#logout()
#### 参数
无
#### 返回值
`Promise.resolve()` 退出成功。
`Promise.reject(err)` 退出失败。`err`为`sysujwxt#Error`类型。  
#### 说明
用于退出当前登录。未登录调用不会返回`Promise.reject`，但是没有登录信息等其它错误依然会返回失败。
### Others
由于选课系统暂时未开放，目前只提供登录登出对应接口，待选课系统再次开放后将会制作相应API
## sysujwxt#Error
### Error.$errorType
+ success
    + code: 0  
    + 成功
    + 用于测试，实际中不会返回。
+ serverError
    + code: 1
    + 服务器错误。
    + 教务系统或者选课系统出错，或者系统返回值出错。
+ httpError
    + code: 2
    + http请求出错。
    + 网络请求失败，需要检查网络设置。
+ wrongPassword
    + code: 3
    + 密码错误。
    + 登录过程中密码错误或者用户不存在。
+ wrongCheckCode
    + code: 4
    + 验证码错误。
    + 登录过程中验证码错误。
+ needCookie
    + code: 5
    + 需要登录信息。
    + 需要先调用获取登录信息后才能调用。
+ needLogin
    + code: 6
    + 需要登录。
    + 需要先登录才能调用。
+ electFail
    + code: 7
    + 选课或退课失败。
    + 选课系统的选课或退课失败。
    + 会有一个额外的`addon`字段表示错误信息。

### Error.message[$code]
#### 说明
用于将错误码转换为错误信息，如：
    
    Error.message[Error.success.code] == 'success';
    
    Error.message[Error.needLogin.code] == 'need login';

# Update
2016/4/20  
增加选课系统接口  
2016/4/11  
添加查询选课结果  
2016/4/9  
目前只支持获取课程表和查询成绩  