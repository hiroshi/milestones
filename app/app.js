var Store = {
  localStorageKey: 'milestonesStore',
  callbacks: [],
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
    console.log(obj);
    localStorage.setItem(this.localStorageKey, JSON.stringify(obj));
    this.callbacks.forEach(function(callback) {
      var tmp = {};
      tmp[name] = value;
      callback(tmp);
    });
  },
  _persistentObj: function() {
    return JSON.parse(localStorage.getItem(this.localStorageKey)) || {};
  }
};

var EnterSpaceName = React.createClass({
  _handleSubmit: function(e) {
    e.preventDefault();
    Store.set('spaceName', this.refs.spaceName.getDOMNode().value.trim());
  },
  render: function() {
    return (
      <form className="form-inline" onSubmit={this._handleSubmit}>
        <input ref="spaceName" className="form-control" placeholder="Backlog space name" />
        <button className="btn btn-primary">OK</button>
      </form>
    );
  }
});

var EnterApiKey = React.createClass({
  _handleSubmit: function(e) {
    e.preventDefault();
    Store.set('apiKey', this.refs.apiKey.getDOMNode().value.trim());
  },
  render: function() {
    var link = "https://" + Store.get('spaceName') + ".backlog.jp/EditApiSettings.action";
    return (
      <form onSubmit={this._handleSubmit}>
        <div className="form-group">
          <a href={link} target="_blank">Grab your API key from here</a>
        </div>
        <div className="form-group">
          <input ref="apiKey" className="form-control" placeholder="Your backlog API key" />
        </div>
        <button className="btn btn-primary">OK</button>
      </form>
    );
  }
});

var Test = React.createClass({
  getInitialState: function() {
    return {
      issues: []
    };
  },
  componentWillMount: function() {
     var url = "https://" + Store.get('spaceName') + ".backlog.jp/api/v2/issues?apiKey=" + Store.get('apiKey') + "&projectId[]=1073802649";
    $.get("/proxy?url=" + encodeURIComponent(url), function(issues) {
      this.setState({issues: issues});
    }.bind(this));
  },
  render: function() {
    issues = this.state.issues.map(function(issue) {
      return <li>{issue.summary}</li>
    });
    return (
      <div className="row">
        <div className="col-sm-12">
          <h1>Milestones</h1>
          <ul>
            {issues}
          </ul>
        </div>
      </div>
    );
  }
});

var App = React.createClass({
  getInitialState: function() {
    return {}
  },
  componentWillMount: function() {
    Store.registerCallback(function(obj) {
      console.log(obj);
      this.setState(obj);
    }.bind(this));
  },
  render: function() {
    var content = null;
    if (!this.state.spaceName) {
      content = <EnterSpaceName />
    } else if (!this.state.apiKey) {
      content = <EnterApiKey />
    } else {
      content = <Test />
    }
    return (
      <div className="row">
        <div className="col-sm-12">
          {content}
        </div>
      </div>
    );
  }
});

React.render(<App />, document.getElementById('app'));
