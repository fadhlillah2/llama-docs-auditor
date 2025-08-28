import React, { useState } from "react";
import Upload from "../components/Upload";
import Chat from "../components/Chat";
import DocumentManager from "../components/DocumentManager";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'documents'>('upload');

  return(  
      <div className="App">
        <aside className="side_menu">
          <div className="tab-container">
            <div className="tab-header">
              <button 
                className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </button>
              <button 
                className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documents
              </button>
            </div>
            <div className="tab-content">
              {activeTab === 'upload' && <Upload />}
              {activeTab === 'documents' && <DocumentManager className="h-full" />}
            </div>
          </div>
        </aside>
        <section className="chat_box" id="#chat">
          <Chat/>
        </section>     
      
      </div>
  )
}

export default Home;