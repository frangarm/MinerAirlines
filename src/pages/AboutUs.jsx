// @ts-nocheck
import React from 'react';
import teamPicture from '../images/TeamPicture.jpeg';
import franciscoPicture from '../images/FranciscoPicture.png';
import emmanuelPicture from '../images/EmmanuelPicture.jpg';
import jamesPicture from '../images/JamesPicture.jpeg';
import rodrigoPicture from '../images/RodrigoPicture.jpeg';
import danielPicture from '../images/DanielPicture.png';
import samuelPicture from '../images/SamuelPicture.jpg';

const teamMembers = [
    {
        name: 'Francisco Garcia',
        role: 'Team Member',
        bio: 'Hi, I’m Francisco Garcia, a Computer Science student at the University of Texas at El Paso. I have a passion for technology and problem-solving, which led me to pursue a degree in computer science. I enjoy learning new programming languages and working on projects that challenge my skills. In my free time, I like to explore new technologies and stay up-to-date with the latest trends in the tech industry.',
        image: franciscoPicture,
        imageAlt: 'Francisco Garcia Photo'
    },
    {
        name: 'Rodrigo Mauricio',
        role: 'Team Member',
        bio: 'Hello! My name is Rodrigo Mauricio, I am a Computer Science student at UTEP. I hope to apply my skills to the field of computer vision and language recognition. I love language learning, and I am currently trying to learn French and Korean. I also love rock climbing and hiking, doing it as often as I can. In the future I want to create software that aligns with my interests and helps other people.',
        image: rodrigoPicture,
        imageAlt: 'Rodrigo Mauricio Photo'
    },
    {
        name: 'James Poole',
        role: 'Team Member',
        bio: 'Hello! I’m currently an undergraduate studying at the University of Texas at El Paso with a major in Computer Science and a minor in Creative Writing. The reason I decided to study computer science is because I love a good puzzle to solve! I have been picking up new programming languages every semester and there is still so much for me to learn!',
	image: jamesPicture,
	imageAlt: 'James Poole Photo'
    },
    {
        name: 'Samuel Arzola',
        role: 'Team Member',
        bio: 'I’m a developer for Miner Airlines and I’m currently pursuing a Bachelor of Science in Computer Science at UTEP, with an expected graduation date in fall 2026. My concentration is in software engineering, and I have experience working on team-based projects. I take a strong approach to planning schedules and goals so the team always knows what to work on and can continue making progress. My primary interests are in software design, especially game design, because I have a passion for creating worlds for players to immerse themselves in.',
        image: samuelPicture,
        imageAlt: 'Samuel Arzola Photo'
    },
    {
        name: 'Emmanuel Rodriguez',
        role: 'Team Member',
        bio: 'I’m a Computer Science student passionate about building practical, user friendly applications that solve real problems. MinerAirlines is one of my projects, designed to simulate a modern airline booking system with features like flight search, reservations, and user management. Through this project, I’ve worked with technologies like React, JavaScript, and Firebase to create a responsive and reliable web experience. I’m especially interested in cybersecurity and artificial intelligence, and I enjoy continuously learning new tools and improving my development skills.',
        image: emmanuelPicture,
        imageAlt: 'Emmanuel Rodriguez Photo'
    },
    {
        name: 'Daniel Montellano',
        role: 'Team Member',
        bio: 'Hi, I’m a Computer Science student at The University of Texas at El Paso. My passion for computer science comes from the ability to turn my ideas into reality through technology and software development. In my free time, I enjoy playing the guitar.',
        image: danielPicture,
        imageAlt: 'Daniel Montellano Photo'
    },
];

export default function AboutUs() {
    return (
        <main className="app-site-main app-site-main--fluid">
            <section className="app-card-shell app-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <span className="app-badge-shell" style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '6px 10px', borderRadius: '999px', background: 'rgba(39, 67, 184, 0.08)', color: 'var(--ma-blue)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Miner Airlines
                    </span>
                    <h1 className="section-title" style={{ marginBottom: 0, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>About Us</h1>
                    <p style={{ margin: 0, color: '#64748b', lineHeight: 1.65 }}>
                        Meet the team
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'center', justifyItems: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', borderRadius: '18px', border: '1px solid rgba(39, 67, 184, 0.12)', boxShadow: '0 12px 28px rgba(22, 45, 136, 0.12)', background: '#f8fbff', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
                        <img src={teamPicture} alt="Team Group Photo"
                        style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }} />
                    </div>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h2 className="section-title" style={{ marginBottom: 0, fontSize: 'clamp(1.35rem, 2.6vw, 1.75rem)' }}>Team Members</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                        {teamMembers.map((member, index) => (
                            <article key={member.name} className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '170px' }}>
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    {member.image ? (
                                        <img src={member.image} alt={member.imageAlt}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '85%',
                                            objectFit: 'cover',
                                            ...(member.name === 'Rodrigo Mauricio' ? { imageOrientation: 'none' } : {}),
                                            ...(member.name === 'Daniel Montellano' ? { transform: 'rotate(-90deg)' } : {})
                                        }} />
                                    ) : (
                                        <div style={{ width: '100px', height: '100px', borderRadius: '85%', background: 'linear-gradient(135deg, rgba(39, 67, 184, 0.14), rgba(255, 201, 64, 0.25))', border: '1px solid rgba(39, 67, 184, 0.12)' }} />
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>{member.name}</h3>
                                        <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>{member.role}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ma-blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bio</span>
                                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{member.bio}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
