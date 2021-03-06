/* eslint no-trailing-spaces: 0 */

//This container will mapDispatchToProps the dispatch(addUserOnServer) to itself, render CreateUser dummy-component and pass it the handleSubmit function.

import { connect } from 'react-redux';
import React, { Component } from 'react';
import { browserHistory } from 'react-router';


import CreateUser from '../components/CreateUser.jsx';


import {createUser} from '../reducers/auth.jsx';

const mapDispatchToProps = (dispatch) => {
  return {
    newUserInfo(user){
      return dispatch(createUser(user));
    }
  };
};

class CreateUserContainer extends Component {

  constructor(props){
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit (event) {
    event.preventDefault();
    const userName = event.target.userName.value;
    const password = event.target.password.value;
    const email = event.target.email.value;
    const description = event.target.description.value;
    const url = event.target.url.value;
    this.props.newUserInfo({
      name: userName,
      password: password,
      email: email,
      description: description,
      url: url
    });
    browserHistory.push('/');


  }

  render () {
    return (
      <CreateUser handleSubmit={this.handleSubmit} />
    );
  }
}

export default connect(null, mapDispatchToProps)(CreateUserContainer);
