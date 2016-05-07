
var express = require('express');
var proxy = require('express-http-proxy');
var _ = require('lodash');
var atob = require('atob');

const BASE = 'http://pms.zaphod', API_ROOT = '/';
// const BASE = 'https://pms.wlbd.nl', API_ROOT = '/';
// const BASE = 'http://localhost:4242', API_ROOT = '/api';

var app = express();
app.use(API_ROOT, proxy(BASE));

/**
 * Testing the PMS API
 *
 * Usage:  mocha example/index.js
 */

var SwaggerParser = require('swagger-parser')
var parser = new SwaggerParser()
var hippieSwagger = require('hippie-swagger')
var hippie = require('hippie')
var expect = require('chai').expect
var path = require('path')
var dereferencedSwagger

class Session {

  authorized(hippie) {
    return (this.token) ? hippie.header('Authorization', this.token)
                        : hippie;
  }

  swagger() {
    // Returns hippie-swagger, tests validity against swagger

    return this.authorized(
      hippieSwagger(app, dereferencedSwagger)
      .json()
    )
  }
  hippie() {
    // Returns hippie-swagger, tests validity against swagger

    return this.authorized(
      hippie(app)
      .json()
    )
  }

  getPermissions(resource) {
    // Returns permissions based on the resource, and session properties.

    // fetch the resources permissions
    return _.get(this.permissions, resource, {});
  }


  getError(body) {
    var err = body.error

    try {
      err = JSON.parse(err)
      return err.error;
    } catch (e) {
      return err;
    }
  }
  parse(resp) {
    return JSON.parse(resp.body)
  }

  parseLoginResponse(body) {
    this.token = body.token;
    this.permissions = body.permissions;
    this.user_id = JSON.parse(
      atob(
        body.token
            .split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/')
      )
    ).user;
  }

  login(user, password) {
    return this.swagger()
      .post('/api/login')
      .send({user, password})
      .expectStatus(200)
      .end()
      .then(this.parse)
      .then((body) => this.parseLoginResponse(body))
  }
}

function error(message) {
  // Returns a function which can be fed into an hippie expect call.

  return (res, body, next) => {
    expect(body.error).to.equal(message)
    next()
  }
}

function baseAPIResource(resource, session) {
  // test the API for basic functionalities.

  describe('Fetching fields metadata', function () {

  })


  describe('GET /' + resource, function () {
    var fetched;
    it('should return resources', function () {
      return session.swagger()
      .get('/api/' + resource)
      .expectStatus(200)
      .end()
      .then(session.parse)
      .then((data) => { fetched = data; })
    })
    
    it('should only contain viewable fields', () => function () {
      var resourcePermissions = session.getPermissions(resource);

      _.each(_.get(fetched, resource), function (item) {
        if (resourcePermissions.self && (item.id === session.user_id)) {
          expect(
            _.difference(
              _.keys(item),
              _.uniq(_.concat(resourcePermissions.self.view, resourcePermissions.view))
            )
          ).to.be.empty; 
        } else {
          expect(
            _.difference(
              _.keys(item),
              resourcePermissions.view
            )
          ).to.be.empty; 
        }
      })
    })

    it('a single item', function () {
      // Find a valid resource id from the fetched data
      var resourceId = _.head(_.keys(_.get(fetched, resource)));
      var resourceParam = resource + '_id';

      return session.swagger()
      .get('/api/' + resource + '/{' + resourceParam + '}')
      .pathParams({
        [resourceParam]: _.toInteger(resourceId)
      })
      .expectStatus(200)
      .end()
    });
  })

  describe('POST /' + resource, function () {
    it('can not add empty data', function () {
      // test with plain hippie
      return session.hippie()
      .post('/api/' + resource)
      .send({})
      .expectStatus(400)
      .expect((res, body, next) => {
        var error = session.getError(body);
        (_.has(session.permissions, [resource, 'create']))
          // When the user has create permissions.
          // It should warn about creating nothing
          ? expect(error).to.equal('Creating nothing is not allowed')
          // When it has no permissions,
          // It should warn about not allowing creating.
          : expect(error).to.equal('Creating "' + resource + '" not allowed');
        
        next()
      })
      .end()
    })
  })

  describe('PUT /' + resource, function () {
    it('can update using correct gid');
    it('can not update without gid');
    it('can not update with incorrect gid');
    it('can not write field without permissions');
  })

  describe('DELETE /' + resource, function () {
    it('can delete resources');
  })
}

// Start of actual tests

describe('Using pms', function () {
  before(function (done) {
    // if using mocha, dereferencing can be performed prior during initialization via the delay flag:
    // https://mochajs.org/#delayed-root-suite
    parser.dereference(path.join(__dirname, '../swagger.yaml'), function (err, api) {
      if (err) return done(err)
      dereferencedSwagger = api
      done()
    })
  })


  describe('as board', function () {
    const session = new Session()

    it('can login', () => 
      session.login('sammy@example.com', '1234')
    )

    describe('on people:', function () {
      baseAPIResource('people', session)
    })

    describe('on roles', function () {
      baseAPIResource('roles', session)
    })

    // describe('on fields', function () {
    //   baseAPIResource('fields', session)
    // })

  })

  describe('as member', function () {
    const session = new Session()

    it('can login', () => 
      session.login('wikkert@example.com', '1234')
    )

    describe('on people:', function () {
      baseAPIResource('people', session)
    })

    describe('on roles', function () {
      baseAPIResource('roles', session)
    })

    // describe('on fields', function () {
    //   baseAPIResource('fields', session)
    // })
  })

  describe('unauthorized', function () {
    const session = new Session()

    it('can not login.', function () {
      return session.swagger()
        .post('/api/login')
        .send({'user': 'wikkert@example.com', 'password': '1234s'})
        .expectStatus(400)
        .end()
    })
    it('can not login with null password', function () {
      return session.hippie()
        .post('/api/login')
        .send({'user': 'wikkert@example.com', 'password': null})
        .expectStatus(400)
        .end()
    })

    it('should not get people without authorization.', function () {
      return session.swagger()
        .get('/api/people')
        .expectStatus(400)
        .expect(error('No Authorization header found'))
        .end()
    })

    it('should not get roles without authorization.', function () {
      return session.swagger()
        .get('/api/roles')
        .expectStatus(400)
        .expect(error('No Authorization header found'))
        .end()
    })

    it('should not get fields without authorization.', function () {
      return session.swagger()
        .get('/api/fields')
        .expectStatus(400)
        .expect(error('No Authorization header found'))
        .end()
    })
  })
})