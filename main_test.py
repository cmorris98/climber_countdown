import pytest


@pytest.fixture
def app():
    import main
    main.app.testing = True
    return main.app.test_client()


def test_form(app):
    r = app.get('/form')
    assert r.status_code == 200
    assert 'Submit a form' in r.data.decode('utf-8')


def test_submitted_form(app):
    r = app.post('/submitted', data={
        'name': 'Inigo Montoya',
        'email': 'inigo@example.com',
        'site_url': 'http://example.com',
        'comments': ''})
    assert r.status_code == 200
    assert 'Inigo Montoya' in r.data.decode('utf-8')
