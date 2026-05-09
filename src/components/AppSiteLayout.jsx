// @ts-nocheck
import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteChromeHeader from './SiteChromeHeader';
import '../styles/AppSiteLayout.css';

export default function AppSiteLayout() {
    return (
        <div className="appSitePage">
            <SiteChromeHeader />
            <div className="appSiteOutletFill">
                <Outlet />
            </div>
        </div>
    );
}
