require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = chai.assert

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
const should = chai.should()
chai.use(chaiHttp)

/**
 * root level hooks
 */
after((done) => {
    // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
    mongoose.models = {}
    mongoose.modelSchemas = {}
    mongoose.connection.close()
    done()
})

const SAMPLE_OBJECT_ID = mongoose.Types.ObjectId()

const sampleUser = new User({
    username: 'myuser',
    password: 'mypassword',
})

describe('Message API endpoints', () => {
    beforeEach((done) => {

        const sampleMessage = new Message({
            title: 'Test',
            body: 'random words',
            author: sampleUser
        })
        sampleUser.save()
        sampleMessage.save()
            .then(() => {
                done()
            })
    })

    afterEach((done) => {
        Message.deleteMany({ title: ['Test', 'Another Test'] })
        User.deleteMany({ username: ['myuser', 'anotheruser'] })
            .then(() => {
                done()
            })
    })

    it('should load all messages', (done) => {
        chai.request(app)
            .get('/messages')
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)
                expect(res.body.messages).to.be.an("array")
                done()
            })
    })

    it('should get one specific message', (done) => {
        chai.request(app)
            .get(`/messages/${SAMPLE_OBJECT_ID}`)
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)
                expect(res.body).to.be.an("object")
                expect(res.body.title).to.equal('Test')
                expect(res.body.body).to.equal('random words')
                done()
            })
    })

    it('should post a new message', (done) => {
        chai.request(app)
            .post('/messages')
            .send({ title: 'Another Test', body: 'random words', author: SAMPLE_OBJECT_ID })
            .end((err, res) => {
                if (err) { done(err) }
                expect(res.body).to.be.an("object")
                expect(res.body).to.have.property('title', 'Another Test')
                expect(res.body).to.have.property('body', 'random words')

                Message.findOne({ title: 'Another Test' }).then(message => {
                    expect(message).to.be.an("object")
                    expect(message).to.have.property('title', 'Another Test')
                    expect(message).to.have.property('body', 'random words')
                    done()
                })
            })
    })


    it('should update a message', (done) => {
        chai.request(app)
            .put(`/messages/${SAMPLE_OBJECT_ID}`)
            .send({ body: 'different words' })
            .end((err, res) => {
                if (err) { done(err) }
                expect(res.body.message).to.be.an("object")
                expect(res.body.message).to.have.property('title', 'Another Title')
                expect(res.body.message).to.have.property('body', 'different words')

                Message.findOne({ title: 'Another Title' }).then(message => {
                    expect(message).to.be.an("object")
                    expect(message).to.have.property('title', 'Another Title')
                    expect(message).to.have.property('body', 'different words')
                    done()
                })
            })
    })

    it('should delete a message', (done) => {
        chai.request(app)
            .delete(`/messages/${SAMPLE_OBJECT_ID}`)
            .end((err, res) => {
                if (err) { done(err) }
                expect(res.body.message).to.equal('Successfully deleted.')

                Message.findOne({ title: 'Another Title' }).then(message => {
                    expect(message).to.equal(null)
                    done()
                })
            })
    })
})
