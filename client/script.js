var app = angular.module('task', ['ngRoute']);
app.factory('taskService', ['$http', function($http) {
	var blankTask = {
		id: -1,
		name: '',
		isDone: false,
		isModifying: false
	};

  var getBlankTask = function() {
      return blankTask;
  };
  
  var saveTask = function(task,onSuccess,onError) {
	$http({
		method: 'PUT',
		url: '/task',
		headers: {'Content-Type': 'application/json; charset=UTF-8'},
		data: task
	}).then(onSuccess,onError);
  };

  var updateTask = function(task,onSuccess,onError) {
	$http({
		method: 'POST',
		url: '/task',
		headers: {'Content-Type': 'application/json; charset=UTF-8'},
		data: task
	}).then(onSuccess,onError);
  };
  
  var deleteTask = function(task,onSuccess,onError) {
	  console.log('delete');
	$http({
		method: 'DELETE',
		url: '/task/'+task.id
	}).then(onSuccess,onError);
  };

  var getTasks = function(onSuccess, onError){
	  console.log('getTasks');
        /*var onSuccess = function (data, status, headers, config) {
                return data.tasks;
        };
        var onError = function (data, status, headers, config) {
                return [];
        }*/
      $http({
		method: 'GET',
		url: '/task'
	}).then(onSuccess,onError);
  };

  return {
    getBlankTask: getBlankTask,
    saveTask: saveTask,
	updateTask: updateTask,
    deleteTask: deleteTask,
    getTasks: getTasks
  };

}]);
app.controller('home', ['$scope','$location','taskService', function($scope, $location, taskService) {
	$scope.pagename = 'Tasks';
	$scope.task = {};
	$scope.tasks = [];
	$scope.isTaskFormDisabled = false;
	
	$scope.deleteTask = function (task) {
		var onSuccess = function (data, status, headers, config) {
			console.log('data',data);
			if(data.data.success){
				//alert('Thanks. We have received your request.');
				$scope.message = {type:'success',text:data.data.successMessage};
			}else{
				$scope.message = {type:'danger',text:'Error occured - '+data.data};
				//alert('Error occured - '+data.data);
			}
			$scope.setup();
		};
		var onError = function (data, status, headers, config) {
			console.log('data',data);
			$scope.message = {type:'danger',text:'Error occured - '+data.data};
			//alert('Error occured.');
		}
		taskService.deleteTask(task,onSuccess,onError);
	};
	$scope.addTask = function () {
		console.log('Sending task ',$scope.task);
		$scope.isTaskFormDisabled = true;
	
		var onSuccess = function (data, status, headers, config) {
			console.log('data',data);
			if(data.data.success){
				//alert('Thanks. We have received your request.');
				$scope.message = {type:'success',text:data.data.successMessage};
				$scope.resetForm();
			}else{
				$scope.message = {type:'danger',text:'Error occured - '+data.data};
				//alert('Error occured - '+data.data);
			}
			$scope.isTaskFormDisabled = false;
			$scope.setup();
		};
		var onError = function (data, status, headers, config) {
			console.log('data',data);
			$scope.message = {type:'danger',text:'Error occured - '+data.data};
			//alert('Error occured.');
			$scope.isTaskFormDisabled = false;
		}
		taskService.saveTask($scope.task,onSuccess,onError);

	};
	$scope.updateTask = function (task) {
		console.log('updating task ',task);
		$scope.isTaskFormDisabled = true;
	
		var onSuccess = function (data, status, headers, config) {
			console.log('data',data);
			if(data.data.success){
				//alert('Thanks. We have received your request.');
				$scope.message = {type:'success',text:data.data.successMessage};
				$scope.resetForm();
			}else{
				$scope.message = {type:'danger',text:'Error occured - '+data.data};
				//alert('Error occured - '+data.data);
			}
			$scope.isTaskFormDisabled = false;
			$scope.setup();
		};
		var onError = function (data, status, headers, config) {
			console.log('data',data);
			$scope.message = {type:'danger',text:'Error occured - '+data.data};
			//alert('Error occured.');
			$scope.isTaskFormDisabled = false;
		}
		taskService.updateTask(task,onSuccess,onError);

	};
	$scope.setup = function(){
		$scope.task = taskService.getBlankTask();
		console.log('setup');
		var onSuccess = function (data, status, headers, config) {
			$scope.tasks = data.data.tasks;
			for(let t of $scope.tasks){
				if(t.isModifying===undefined){
					t.isModifying = false;
				}
			}
			console.log('$scope.tasks',$scope.tasks);
		};
		var onError = function (data, status, headers, config) {
				$scope.tasks = [];
		}
		taskService.getTasks(onSuccess,onError);
		$scope.resetForm();
	}
	$scope.setupEditTask = function(task){
		task.isModifying = !task.isModifying;
	}
	$scope.initiateNewTask = function () {
		console.log('initiateNewTask');
		$scope.blankTask = taskService.getBlankTask();
		$scope.task = angular.copy($scope.blankTask);
		$location.path( "/" );
	};
	$scope.resetForm = function () {
		$scope.task = angular.copy($scope.blankTask);
	};
	$scope.resetMessage = function () {
		$scope.message = {type:'none',text:''};
	};
}]);