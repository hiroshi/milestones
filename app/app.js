(function() {

var Routes = ReactRouter.Routes;
var Route = ReactRouter.Route;
var Link = ReactRouter.Link;

var Store = {
  localStorageKey: 'milestonesStore',
  callbacks: [],
  _persistentObj: function() {
    return JSON.parse(localStorage.getItem(this.localStorageKey)) || {};
  },
  registerCallback: function(callback) {
    this.callbacks.push(callback);
    var obj = this._persistentObj();
    if (obj) {
      callback(obj);
    }
  },
  get: function(name) {
    return this._persistentObj()[name];
  },
  set: function(name, value) {
    var obj = this._persistentObj();
    obj[name] = value;
    localStorage.setItem(this.localStorageKey, JSON.stringify(obj));
    this.callbacks.forEach(function(callback) {
      var tmp = {};
      tmp[name] = value;
      callback(tmp);
    });
  },
  spaces: function() {
    return this._persistentObj()['spaces'] || {};
  },
  setSpace: function(name, params) {
    var spaces = this.spaces();
    if (spaces[name]) {
      $.extend(spaces[name], params);
    } else {
      spaces[name] = params;
    }
    this.set('spaces', spaces);
  },
  getSpace: function(name) {
    return this.spaces()[name];
  },
  removeSpace: function(name) {
    var spaces = this.spaces();
    delete spaces[name];
    this.set('spaces', spaces);
  },
  getAPI: function(spaceName, path, params, callback) {
    var space = this.getSpace(spaceName);
    //var url = this.getBaseURL(spaceName) + path + "?" + $.param($.extend({apiKey: space.apiKey}, params));
    var url = this.getURL(spaceName, path, $.extend({apiKey: space.apiKey}, params));
    console.log(url);
    $.get("/proxy?url=" + encodeURIComponent(url), callback);
  },
  getURL: function(spaceName, path, params) {
    var url = "https://" + spaceName + ".backlog.jp" + path;
    if (params) {
      url += "?" + $.param(params);
    }
    return url;
  }
};

var EnterSpaceName = React.createClass({
  mixins: [ReactRouter.Navigation],
  _handleSubmit: function(e) {
    e.preventDefault();
    var spaceName = this.refs.spaceName.getDOMNode().value.trim();
    this.transitionTo('space', {spaceName: spaceName});
  },
  render: function() {
    return (
      <form className="form-horizontal" onSubmit={this._handleSubmit}>
        <div className="form-group">
          <div className="col-sm-4">
            <input ref="spaceName" className="form-control" placeholder="Backlog space name" autoFocus={true} />
          </div>
        </div>
        <button className="btn btn-primary">OK</button>
      </form>
    );
  }
});

var SpaceSelect = React.createClass({
  mixins: [ReactRouter.Navigation],
  render: function() {
    var spaces = Object.keys(Store.spaces()).map(function(spaceName) {
      return (
        <Link to="space" params={{spaceName: spaceName}} className="btn btn-default">
          {spaceName}
        </Link>
      );
    });
    return (
      <div className="btn-group">
        {spaces}
        <Link to='enterSpaceName' className="btn btn-default">
          <span className="glyphicon glyphicon-plus" aria-hidden="true"></span> Add space
        </Link>
      </div>
    );
  }
});

var Space = React.createClass({
  mixins: [ReactRouter.Navigation],
  _init: function(props) {
    var spaceName = props.params.spaceName;
    var space = Store.getSpace(spaceName);
    if (!space) {
      this.transitionTo('enterApiKey', {spaceName: spaceName});
    } else {
      this.transitionTo('issues', {spaceName: spaceName});
    }
  },
  componentWillMount: function() {
    this._init(this.props);
  },
  componentWillReceiveProps: function(nextProps) {
    this._init(nextProps);
  },
  render: function() {
    return (
      <div>
        <this.props.activeRouteHandler/>
      </div>
    );
  }
});

var EnterApiKey = React.createClass({
  mixins: [ReactRouter.Navigation],
  _handleSubmit: function(e) {
    e.preventDefault();
    var spaceName = this.props.params.spaceName;
    var apiKey = this.refs.apiKey.getDOMNode().value.trim();
    Store.setSpace(spaceName, {apiKey: apiKey});
    this.transitionTo('issues', {spaceName: spaceName});
  },
  render: function() {
    var spaceName = this.props.params.spaceName;
    var link = "https://" + spaceName + ".backlog.jp/EditApiSettings.action";
    return (
      <form className="form-horizontal" onSubmit={this._handleSubmit}>
        <div className="form-group">
          <div className="col-sm-12">
            Space name: {spaceName}<br/>
            <a href={link} target="_blank">Grab your API key from here.</a>
          </div>
        </div>
        <div className="form-group">
          <div className="col-sm-12">
            <input ref="apiKey" className="form-control" placeholder="Your backlog API key" />
          </div>
        </div>
        <button className="btn btn-primary">OK</button>
      </form>
    );
  }
});

var Project = React.createClass({
  _handleChange: function(event) {
    var spaceName = this.props.spaceName;
    var space = Store.getSpace(spaceName);
    var project = this.props.project;
    var projectIds = space.projectIds || [];
    if (event.target.checked) {
      projectIds = _.union(projectIds, [project.id]);
    } else {
      projectIds = _.without(projectIds, project.id);
    }
    console.log(projectIds);
    Store.setSpace(spaceName, {projectIds: projectIds});
  },
  render: function() {
    var spaceName = this.props.spaceName;
    var space = Store.getSpace(spaceName);
    var project = this.props.project;
    var checked = space.projectIds && (space.projectIds.indexOf(project.id) > -1);
    return (
      <label className="checkbox-inline">
        <input type='checkbox' checked={checked} onChange={this._handleChange} />
        {this.props.project.name}
      </label>
    );
  }
});

var Issues = React.createClass({
  mixins: [ReactRouter.Navigation],
  _handleRemove: function() {
    var spaceName = this.props.params.spaceName;
    Store.removeSpace(spaceName);
    this.transitionTo('/');
  },
  getInitialState: function() {
    return {
      users: [],
      projects: [],
      milestones: [],
      issues: [],
      issuesByUsers: {},
      loadingIssues: true
    };
  },
  componentWillMount: function() {
    var spaceName = this.props.params.spaceName;
    // Get Projects
    Store.getAPI(spaceName, '/api/v2/projects', {}, function(projects) {
      this.setState({projects: projects});
    }.bind(this));
    // Get Users
    Store.getAPI(spaceName, '/api/v2/users', {}, function(users) {
      this.setState({users: users});
    }.bind(this));
    // Register for checked projectIds
    Store.registerCallback(function(obj) {
      var space = obj.spaces[spaceName];
      if (space && space.projectIds) {
        space.projectIds.forEach(function(projectId) {
          // Get active milestones
          Store.getAPI(spaceName, '/api/v2/projects/' + projectId + '/versions', {}, function(milestones) {
            var activeMilestones = milestones
            .filter(function(milestone) {
              return !milestone.archived;
            })
            .sort(function(a, b) {
              return a.displayOrder - b.displayOrder;
            });
            // }).sort(function(a, b) {
            //   if (a.releaseDueDate && b.releaseDueDate) {
            //     return a.releaseDueDate - b.releaseDueDate;
            //   } else if (a.releaseDueDate) {
            //     return -1;
            //   } else if (b.releaseDueDate) {
            //     return 1;
            //   } else {
            //     return 0;
            //   }
            // });
            this.setState({milestones: activeMilestones});
          }.bind(this));
        }.bind(this));
        // Get all open issues
        var issuesParams = {
          'projectId[]': space.projectIds,
          'statusId[]': [1,2,3],
          'count': 100,
          'offset': 0,
        };
        this.setState({issues: []});
        var repeatGetIssues = function() {
          Store.getAPI(spaceName, '/api/v2/issues', issuesParams, function(newIssues) {
            if (newIssues.length > 0) {
              this.setState({issues: this.state.issues.concat(newIssues)});
              issuesParams.offset += issuesParams.count;
              repeatGetIssues();
            } else {
              console.log("Total open issues: " + this.state.issues.length);
              var issuesByUsers = {};
              // Finish getting all issues
              this.state.issues.forEach(function(issue) {
                var userId = issue.assignee ? issue.assignee.id : 0;
                var issuesByMilestones = issuesByUsers[userId];
                if (!issuesByMilestones) {
                  issuesByUsers[userId] = issuesByMilestones = [];
                }
                issue.milestone.forEach(function(milestone) {
                  var issues = issuesByMilestones[milestone.id];
                  if (!issues) {
                    issuesByMilestones[milestone.id] = issues = [];
                  }
                  issues.push(issue);
                });
              });
              this.setState({issuesByUsers: issuesByUsers, loadingIssues: false});
            }
          }.bind(this));
        }.bind(this)
        repeatGetIssues();
      }
    }.bind(this));
  },
  render: function() {
    var spaceName = this.props.params.spaceName;
    var projects = this.state.projects.map(function(project) {
      return <li key={project.id}><Project project={project} spaceName={spaceName} /></li>;
    });
    var issuesByUsers = this.state.users.filter(function(user) {
      return Boolean(this.state.issuesByUsers[user.id]);
    }.bind(this)).map(function(user) {
      var milestonesForUser = this.state.issuesByUsers[user.id];
      var milestones = this.state.milestones.filter(function(milestone) {
        return Boolean(milestonesForUser[milestone.id]);
      }).map(function(milestone) {
        var issues = milestonesForUser[milestone.id].map(function(issue) {
          return (
            <a key={issue.id} href={Store.getURL(spaceName, "/view/" + issue.issueKey)} target="_blank" className="list-group-item">
              <span className="label label-default">{issue.issueKey}</span> {issue.summary}
            </a>
          );
        });
        return (
          <div>
            <h5 key={milestone.id} className="milestone">
              {milestone.name}
            </h5>
            <div className="list-group">
              {issues}
            </div>
          </div>
        );
      });
      return (
        <div key={user.id} className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">{user.name}</h3>
          </div>
          <div className="panel-body">
            {milestones}
          </div>
        </div>
      );
    }.bind(this));
    if (issuesByUsers.length == 0 && this.state.loadingIssues) {
      issuesByUsers = <li>Loading... {this.state.issues.length}</li>
    }
    return (
      <div className="row">
        <div className="col-sm-12">
          <h3>Projects</h3>
          <ul className="list-inline">
            {projects}
          </ul>
          <h3>Issues</h3>
          {issuesByUsers}
          <div className="pull-right">
            <button className="btn btn-danger btn-small" onClick={this._handleRemove}>
              Remove space
            </button>
          </div>
        </div>
      </div>
    );
  }
});

var App = React.createClass({
  render: function() {
    return (
      <div>
        <SpaceSelect />
        <this.props.activeRouteHandler />
      </div>
    );
  }
});

React.render((
  <Routes location="hash">
    <Route path="/" handler={App}>
      <Route name="space" path="spaces/:spaceName" handler={Space}>
        <Route name="enterApiKey" handler={EnterApiKey} />
        <Route name="issues" handler={Issues} />
      </Route>
      <Route name="enterSpaceName" handler={EnterSpaceName} />
    </Route>
  </Routes>
), document.getElementById('app'));

window.MilestoneStore = Store;
})();
