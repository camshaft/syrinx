var Syrinx = require('../');
var should = require('should');

describe('Syrinx', function() {
  var c;
  beforeEach(function() {
    c = new Syrinx(this.currentTest.title);
  });

  describe('#register', function() {

    it('should register a function', function() {
      c.register('foo', function() {
        return {
          bar: 'baz'
        };
      });
      c.validate();

      var foo = c.get('foo');
      should.exist(foo.bar);
      foo.bar.should.eql('baz');
    });

    it('should register a named function', function() {
      function foo() {
        return 1;
      }
      c.register(foo);
      c.validate();
      var res = c.get(foo);
      should.exist(res);
      res.should.eql(1);
    });

    it('should register an annonymous function', function() {
      var foo = function () {
        return 1;
      }
      c.register(foo);
      c.validate();
      var res = c.get(foo);
      should.exist(res);
      res.should.eql(1);
    });

    it('should register a function with dependencies', function() {
      c.register('bar', function() {
        return 1;
      });
      c.register('baz', function() {
        return 2;
      });
      c.register('foo', ['bar', 'baz'], function(bar, baz) {
        return {
          bar: bar,
          baz: baz
        };
      });
      c.validate();

      var foo = c.get('foo');

      should.exist(foo);
      foo.should.eql({
        bar: 1,
        baz: 2
      });
    });
  });

  describe('#get', function() {

    it('should lookup multiple dependencies', function() {
      c.register('foo', function() {
        return 'foo';
      });
      c.register('bar', function() {
        return 'bar';
      });
      c.register('baz', function() {
        return 'baz';
      });
      c.validate();

      var obj = c.get(['foo', 'bar', 'baz']);
      should.exist(obj);
      obj.should.eql({
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      });
    });

    it('should lookup a dependency by reference', function() {
      function foo () {
        return 'foo';
      }
      c.register('foo', foo);
      c.validate();

      var res = c.get(foo);
      should.exist(res);
      res.should.eql('foo');
    });

  });

  describe('#validate', function() {

    it('should validate against cyclical dependencies', function() {
      c.register('foo', ['bar'], function() {
        return 'foo';
      });
      c.register('bar', ['baz'], function() {
        return 'bar';
      });
      c.register('baz', ['foo'], function() {
        return 'baz';
      });
      c.validate.bind(c).should.throw();
    });

    it('should validate against missing dependencies', function() {
      c.register('foo', ['bar'], function() {
        return 'foo';
      });
      c.register('baz', ['test'], function() {
        return 'baz';
      });
      c.validate.bind(c).should.throw();
    });

  });

  describe('.dependency', function() {
    it('should add dependencies to a function', function() {
      function Bar() {
        return 'bar';
      }
      function Baz() {
        return 'baz';
      }
      function Foo(bar, baz) {
        return [bar, baz];
      }
      Syrinx.dependency(Foo, [Bar, Baz]);
      c.register(Baz);
      c.register(Bar);
      c.register(Foo);
      c.validate();

      var res = c.get(Foo);
      should.exist(res);
      res.should.eql(['bar', 'baz']);
    });
  });
});
