# API of the education system of SYSU

## 中山大学教务系统API

## Quick Start
	
	var sysu = require('sysujwxt');
	
	sysu.jwxt.getCheckCode().then(function (imageData) {
		// imageData string in base64 format
	});
	
	sysu.jwxt.login($username, $password, $checkcode).then(function () {
		// for example, $year = '2015-2016', $term = '2'
		sysu.jwxt.getTimeTable($year, $term).then(function (courses) {
			// courses in array
		});
		
		// for example, $year = '2015-2016', $term = '2'
		sysu.jwxt.getScore($year, $term).then(function (courses) {
			// score and course info in array
		});
	}, function (error) {
	
		// if password is incorrect
		// then error == sysu.Error.wrongPassword
		
		// if checkcode is incorrect
		// then error == sysu.Error.wrongCheckCode
	});

---
## Usage


---
## Update
2016/4/11
添加查询选课结果
2016/4/9
目前只支持获取课程表和查询成绩