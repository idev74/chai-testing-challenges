require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = chai.assert
const chaiJSON = require('chai-json')

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
const should = chai.should()
chai.use(chaiHttp)
chai.use(chaiJSON)

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

describe('Message API endpoints', () => {
    before((done) => {
        const sampleUser = new User({
            username: 'myuser',
            password: 'mypassword',
            _id: SAMPLE_OBJECT_ID
        })
        sampleUser.save((error, savedUser) => {
            if (error) {
                return done(error)
            }
            this.userId = savedUser._id
        });

        const sampleMessage = new Message({
            title: 'Test',
            body: 'random words',
            author: sampleUser,
            _id: SAMPLE_OBJECT_ID
        });
        sampleMessage.save((error, savedMessage) => {
            if (error) {
                return done(error)
            }
            this.messageId = savedMessage._id
        });
        done()
    });

    after((done) => {
        Message.deleteOne({ _id: this.messageId }, (error) => {
            if (error) {
                return done(error)
            }
            User.deleteOne({ _id: this.userId }, (error) => {
                if (error) {
                    return done(error)
                }
                done()
            });
        });
    });

    it('should load all messages', (done) => {
        chai.request(app)
            .get('/messages')
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)
                expect(res.body.messages).to.be.an("array")
                done()
            })
    });

    it('should get one specific message', (done) => {
        chai.request(app)
            .get(`/messages/${this.messageId}`)
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)
                expect(res.body).to.be.an("object")
                res.should.be.json
                done()
            })
    })

    it('should post a new message', (done) => {
        chai.request(app)
            .post('/messages')
            .send({ title: 'Another Test', body: 'random words', author: this.userId })
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
        const newMessage = {
            title: 'Another Title',
            body: 'different words'
        }
        chai.request(app)
            .put(`/messages/${this.messageId}`)
            .send(newMessage)
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)
                expect(res.body).to.be.an("object")
                res.should.be.json
                expect(res.body).to.have.property('title').equal(newMessage.title)
                expect(res.body).to.have.property('body').equal(newMessage.body)
                expect(res.body).to.have.property('author').equal(`${this.userId}`)

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
            .delete(`/messages/${this.messageId}`)
            .end((err, res) => {
                if (err) { done(err) }
                expect(res).to.have.status(200)

                Message.findById(this.messageId).then(message => {
                    expect(message).to.equal(null)
                    done()
                })
            })
    });
});
