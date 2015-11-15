import React from 'react';
import ReactDOM from 'react-dom';
import mdl from 'react-mdl';

import memberForm from './form';
import FormField from './formField';

import _ from 'lodash';

export default class MemberCreate extends React.Component {

	constructor(props) {
		super(props);

		this.handleChange = this.handleChange.bind(this);

		this.state = {
			forms: [
				memberForm.person,
				memberForm.adress,
				memberForm.contact,
				memberForm.bank,
				memberForm.member,
				memberForm.compukey,
				memberForm.system
			],
			model: {}
		};
	}
	handleChange(value, key) {
		var model = this.state.model;
		model[key] = value;

		this.setState({
			model: model
		});
	}
	render() {

		return (
		<form className='content' onSubmit={this.handleSubmit}>
			{this.state.forms.map((form, key) => (
				<mdl.Card key={key}  className='mdl-color--white mdl-shadow--2dp'>
					<mdl.CardTitle>
						{form.title}
					</mdl.CardTitle>
					<div className="mdl-card__form">
						{form.fields.map((fields, key) => (
							<div key={key} className="mdl-card__formset">
								{(_.isArray(fields) 
									? fields
									: [fields]
								).map(
									(field, key) => (
										<FormField 
											key={key} 
											field={field}
											onChange={this.handleChange}
											value={this.state.model[field.name]} />
									)
								)}
							</div>
						))}
					</div>
				</mdl.Card>
			))}
		</form>
		)
	}
}