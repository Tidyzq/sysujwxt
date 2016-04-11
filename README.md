# API of the education system of SYSU

## 中山大学教务系统API

## Quick Start
	
	var sysujwxt = require('sysujwxt');
	
	sysujwxt.getCheckCode().then(function (imageData) {
		// imageData string in base64 format
	});
	
	sysujwxt.login($username, $password, $checkcode).then(function () {
		// for example, $xnd = '2015-2016', $xq = '2'
		sysujwxt.getTimeTable($xnd, $xq).then(function (courses) {
			// courses in array
		});
		
		// for example, $xnd = '2015-2016', $xq = '2'
		sysujwxt.getScore($xnd, $xq).then(function (courses) {
			// score and course info in array
		});
	}, function (error) {
	
		// if password is incorrect
		// then error == sysujwxt.error.wrongPassword
		
		// if checkcode is incorrect
		// then error == sysujwxt.error.wrongCheckCode
	});

---
## Usage
### sysujwxt#getCookie()
if operation **success**, cookie will be stored in **sysujwxt#loginInfo** and return a `Promise.resolve()`.  
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.  

### sysujwxt#getCheckCode()
this function will automaticly calls **sysujwxt#getCookie**.  
if operation **success**, will return a `Promise.resolve(imageData)`, where `imageData` is the data of image in base64 format.  
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.  

### sysujwxt#login(username, password, checkcode)
`username` is the student id, such as '14330001'.  
`password` is the password of the jwxt.  
`checkcode` is the text on the image got by calling. **sysujwxt#getCheckCode**  
you need either manually set the value of **sysujwxt#loginInfo** or simply calls **sysujwxt#getCheckCode** before calling this function.  
if operation **success**, will return a `Promise.resolve()`.   
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.  

### sysujwxt#isLogin()
this function will check if the user is alreadly loged in, user is recognized by setting the different **sysujwxt.loginInfo**.    
if operation **success**, will return a `Promise.resolve()`.   
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.

### sysujwxt#getTimeTable(xnd, xq)
`xnd` is the year span of the school year you want to check, such as '2015-2016'.  
`xq` is the semester you want to check, such as '2'.  
if operation **success**, will return a `Promise.resolve(courses)`, where `courses` is the data of the courses in array in the following format:

	{
		day: 0,                 // 0 stands for monday and 6 stands for sunday
		name: 'example course', // the name of the course
		place: 'somewhere',     // the place where the class takes
		start: 1,               // the section number the class begins, starts from 1
		last: 4,                // the number of sections the class will lasts
		weeks: '(1-20)'         // weeks that this course is in progress
	}
  
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**. 

### sysujwxt#getScores(xnd, xq)
`xnd` is the year span of the school year you want to check, such as '2015-2016'.  
`xq` is the semester you want to check, such as '2'.  
if operation **success**, will return a `Promise.resolve(courses)`, where `courses` is the data of the courses in array, and the format is the original format got from jwxt which is quite complex so you'd better try to figure out it's meanings on your own XD.  
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.  

### sysujwxt#getElectResult(xnd, xq)
`xnd` is the year span of the school year you want to check, such as '2015-2016'.  
`xq` is the semester you want to check, such as '2'.  
if operation **success**, will return a `Promise.resolve(courses)`, where `courses` is the data of the reulst of your course election in array, and the format is the original format got from jwxt.  
if **fail**, will return a `Promise.reject(errorCode)`, where `errorCode` is one of the **sysujwxt#error**.  

### sysujwxt#error
+ success
+ serverError
+ httpError
+ wrongPassword
+ wrongCheckCode
+ needCookie
+ needLogin

### sysujwxt#errorMessage(errorCode)
put an error code of **sysujwxt#error** and it will give back the message of the error.  
for example:
	
	sysujwxt.errorMessage(sysujwxt.error.httpError);
	// return "http error"

---
## Update
2016/4/11
添加查询选课结果
2016/4/9
目前只支持获取课程表和查询成绩