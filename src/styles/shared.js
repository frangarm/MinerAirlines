export const sharedStyles = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #001f3f 0%, #003d7a 100%);
        color: #333;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }
    .container {
        text-align: center;
        background: white;
        padding: 60px 40px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 100%;
    }
    h1 {
        color: #001f3f;
        font-size: 2.5em;
        margin-bottom: 10px;
    }
    p {
        color: #555;
        font-size: 1.1em;
        margin-bottom: 25px;
        line-height: 1.6;
    }
    .form {
        text-align: left;
        margin-top: 10px;
    }
    .field {
        margin-bottom: 18px;
    }
    label {
        display: block;
        color: #001f3f;
        font-weight: 600;
        margin-bottom: 6px;
    }
    input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid #cfd8e3;
        border-radius: 6px;
        font-size: 1em;
        outline: none;
    }
    input:focus {
        border-color: #ff8c00;
        box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
    }
    .actions {
        margin-top: 10px;
        text-align: center;
    }
    .button {
        display: inline-block;
        padding: 12px 30px;
        margin: 10px;
        background-color: #ff8c00;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        transition: background-color 0.3s ease;
        border: none;
        cursor: pointer;
    }
    .button:hover {
        background-color: #001f3f;
    }
    .button.secondary {
        background-color: #001f3f;
    }
    .button.secondary:hover {
        background-color: #ff8c00;
    }
    .helper {
        margin-top: 12px;
        font-size: 0.95em;
    }
    .helper a {
        color: #ff8c00;
        text-decoration: none;
        font-weight: 600;
    }
    .helper a:hover {
        text-decoration: underline;
    }
    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }
    @media (max-width: 640px) {
        .grid {
            grid-template-columns: 1fr;
        }
    }
`;

export const containerStyles = {
    textAlign: 'center',
    background: 'white',
    padding: '60px 40px',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto'
};

export const buttonStyles = {
    display: 'inline-block',
    padding: '12px 30px',
    margin: '10px',
    backgroundColor: '#ff8c00',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
    border: 'none',
    cursor: 'pointer'
};
