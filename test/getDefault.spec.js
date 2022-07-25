const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

describe("getDefault", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => { sandbox.restore() });

  it("returns response 200", () => {
    const getStub = sandbox.stub(OdkCentral.prototype, 'sendRequest')
      .resolves({ response: { statusCode: 200 }, body: response_with_submission_data })
  })
})