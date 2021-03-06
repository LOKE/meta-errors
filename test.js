import test from "ava";
import { inspect } from "util";

const { createErrorType, registry } = require("./index");
registry.typePrefix = "https://example.com/errors/";

const ErrorA = createErrorType({
  message: "This is error A",
  name: "ErrorA",
  code: "error_a",
  help: "Error a help"
});
const ExposedError = createErrorType({
  name: "ExposedError",
  code: "exposed",
  help: "Exposed help",
  expose: true
});
const NamespaceError = createErrorType({
  name: "NamespaceError",
  code: "namespaced",
  help: "Exposed help",
  namespace: "mystuff"
});
const StackFreeError = createErrorType({
  name: "StackFreeError",
  code: "stack_free",
  help: "No stack trace here",
  stackTrace: false
});

function stack1() {
  stack2();
}

function stack2() {
  stackFinal();
}

function stackFinal() {
  throw new ErrorA();
}

test("default message", t => {
  const err = new ErrorA();
  t.is(err.message, "This is error A");
});
test("custom message", t => {
  const err = new ErrorA("Custom message");
  t.is(err.message, "Custom message");
});
test("instance ID on each message", t => {
  const err = new ErrorA();
  t.is(typeof err.instance, "string");
  t.is(err.instance.length, 26);
});
test("toString includes instance", t => {
  const err = new ErrorA("Custom message.");
  t.is(err.toString(), `ErrorA: Custom message. [${err.instance}]`);
});
test("util.inspect includes instance", t => {
  const err = new ErrorA("Custom message.");
  t.true(
    inspect(err).startsWith(`{ ErrorA: Custom message. [${err.instance}]\n`)
  );
});
test("type", t => {
  const err = new ErrorA();
  t.is(err.type, "https://example.com/errors/error_a");
  t.is(
    JSON.stringify(err),
    `{"message":"This is error A","instance":"${
      err.instance
    }","code":"error_a","type":"https://example.com/errors/error_a"}`
  );
});
test("code", t => {
  const err = new ErrorA();
  t.is(err.code, "error_a");
});
test("expose", t => {
  const err = new ExposedError();
  t.is(err.expose, true);
});
test("namespace", t => {
  const err = new NamespaceError();
  t.is(err.namespace, "mystuff", "Namespace should be exposed");
  t.is(
    err.type,
    "https://example.com/errors/mystuff/namespaced",
    "Namespace should be included in the type"
  );
  t.is(
    JSON.stringify(err),
    `{"message":"Error","instance":"${
      err.instance
    }","code":"namespaced","namespace":"mystuff","type":"https://example.com/errors/mystuff/namespaced"}`
  );
});
test("meta", t => {
  const err = new ErrorA("With meta", { a: 1, b: "two" });
  t.is(err.a, 1);
  t.is(err.b, "two");
  t.is(err.toString(), `ErrorA: With meta [${err.instance}] a=1, b=two`);
  t.is(
    JSON.stringify(err),
    `{"message":"With meta","instance":"${
      err.instance
    }","code":"error_a","type":"https://example.com/errors/error_a","a":1,"b":"two"}`
  );
});
test("stack trace", t => {
  const err = t.throws(() => stack1());
  t.regex(
    err.stack,
    /ErrorA: This is error A \[\w+\]\n    at stackFinal .+\n    at stackFinal .+\n    at stack2 .+\n    at stack1 .+\n    at coreAssert.throws/
  );
});
test("stack trace free", t => {
  const err = t.throws(() => {
    throw new StackFreeError("My message.");
  });
  t.is(err.stack, `StackFreeError: My message. [${err.instance}]`);
});
